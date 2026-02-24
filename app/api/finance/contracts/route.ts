// app/api/finance/contracts/route.ts
// Grain Contracts CRUD API
// Supports: GET (list with filters), POST (create), PUT (update), DELETE

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET — List contracts with optional filters
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cropYear = searchParams.get("cropYear") || "2025";
    const status = searchParams.get("status"); // open, delivered, cancelled
    const crop = searchParams.get("crop");

    let contracts;
    if (status && crop) {
      contracts = await sql`
        SELECT * FROM contracts
        WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)}
          AND status = ${status} AND crop = ${crop}
        ORDER BY delivery_start ASC, created_at DESC
      `;
    } else if (status) {
      contracts = await sql`
        SELECT * FROM contracts
        WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)}
          AND status = ${status}
        ORDER BY delivery_start ASC, created_at DESC
      `;
    } else if (crop) {
      contracts = await sql`
        SELECT * FROM contracts
        WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)}
          AND crop = ${crop}
        ORDER BY delivery_start ASC, created_at DESC
      `;
    } else {
      contracts = await sql`
        SELECT * FROM contracts
        WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)}
        ORDER BY delivery_start ASC, created_at DESC
      `;
    }

    // Summary stats
    const totalBushels = contracts.reduce((s: number, c: any) => s + (parseFloat(c.bushels) || 0), 0);
    const totalValue = contracts.reduce(
      (s: number, c: any) => s + (parseFloat(c.bushels) || 0) * (parseFloat(c.price_per_bushel) || 0),
      0
    );
    const openContracts = contracts.filter((c: any) => c.status === "open");
    const openBushels = openContracts.reduce((s: number, c: any) => s + (parseFloat(c.bushels) || 0), 0);
    const deliveredContracts = contracts.filter((c: any) => c.status === "delivered");
    const deliveredBushels = deliveredContracts.reduce((s: number, c: any) => s + (parseFloat(c.bushels) || 0), 0);

    // By crop summary
    const byCrop: Record<string, { bushels: number; value: number; count: number }> = {};
    for (const c of contracts) {
      const crop = c.crop || "Other";
      if (!byCrop[crop]) byCrop[crop] = { bushels: 0, value: 0, count: 0 };
      byCrop[crop].bushels += parseFloat(c.bushels) || 0;
      byCrop[crop].value += (parseFloat(c.bushels) || 0) * (parseFloat(c.price_per_bushel) || 0);
      byCrop[crop].count += 1;
    }

    return NextResponse.json({
      contracts,
      summary: {
        totalContracts: contracts.length,
        totalBushels,
        totalValue,
        openContracts: openContracts.length,
        openBushels,
        deliveredContracts: deliveredContracts.length,
        deliveredBushels,
        byCrop,
      },
    });
  } catch (error: any) {
    console.error("Contracts GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create new contract
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      crop,
      contract_type = "cash",
      bushels,
      price_per_bushel,
      buyer,
      delivery_start,
      delivery_end,
      crop_year = 2025,
      status = "open",
      notes,
      field_name,
    } = body;

    // Validation
    if (!crop || !bushels || !price_per_bushel) {
      return NextResponse.json(
        { error: "Missing required fields: crop, bushels, price_per_bushel" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO contracts (user_id, crop, contract_type, bushels, price_per_bushel,
                             buyer, delivery_start, delivery_end, crop_year, status, notes, field_name)
      VALUES (${userId}, ${crop}, ${contract_type}, ${parseFloat(bushels)},
              ${parseFloat(price_per_bushel)}, ${buyer || null}, ${delivery_start || null},
              ${delivery_end || null}, ${parseInt(crop_year)}, ${status}, ${notes || null},
              ${field_name || null})
      RETURNING *
    `;

    return NextResponse.json({ contract: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Contracts POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — Update contract (status, price, notes, etc.)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
    }

    // Build dynamic update — only update provided fields
    const result = await sql`
      UPDATE contracts
      SET crop = COALESCE(${updates.crop ?? null}, crop),
          contract_type = COALESCE(${updates.contract_type ?? null}, contract_type),
          bushels = COALESCE(${updates.bushels ? parseFloat(updates.bushels) : null}, bushels),
          price_per_bushel = COALESCE(${updates.price_per_bushel ? parseFloat(updates.price_per_bushel) : null}, price_per_bushel),
          buyer = COALESCE(${updates.buyer ?? null}, buyer),
          delivery_start = COALESCE(${updates.delivery_start ?? null}, delivery_start),
          delivery_end = COALESCE(${updates.delivery_end ?? null}, delivery_end),
          status = COALESCE(${updates.status ?? null}, status),
          notes = COALESCE(${updates.notes ?? null}, notes),
          field_name = COALESCE(${updates.field_name ?? null}, field_name),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ contract: result[0] });
  } catch (error: any) {
    console.error("Contracts PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Remove contract
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM contracts WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error("Contracts DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}