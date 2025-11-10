import express, { Request, Response } from "express";
import { pool } from "./db.js";

export const productsRouter = express.Router();

/**
 * GET /api/products
 * Query params: id, gender, master_category, sub_category, article_type, base_colour, season, usage, min_price, max_price, year
 */
productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      gender,
      master_category,
      sub_category,
      article_type,
      base_colour,
      season,
      usage,
      min_price,
      max_price,
      year,
      search,
    } = req.query;

    console.log('Products API - Query params:', { id, gender, master_category, sub_category, article_type, search });

    const conditions: string[] = [];
    const values: any[] = [];

    // Filters dynamically
    if (id) {
      values.push(Number(id));
      conditions.push(`id = $${values.length}`);
    }
    if (gender) {
      values.push(String(gender));
      conditions.push(`gender ILIKE $${values.length}`);
    }
    if (master_category) {
      values.push(String(master_category));
      conditions.push(`master_category ILIKE $${values.length}`);
    }
    if (sub_category) {
      values.push(String(sub_category));
      conditions.push(`sub_category ILIKE $${values.length}`);
    }
    if (article_type) {
      values.push(String(article_type));
      conditions.push(`article_type ILIKE $${values.length}`);
    }
    if (base_colour) {
      values.push(String(base_colour));
      conditions.push(`base_colour ILIKE $${values.length}`);
    }
    if (season) {
      values.push(String(season));
      conditions.push(`season ILIKE $${values.length}`);
    }
    if (usage) {
      values.push(String(usage));
      conditions.push(`usage ILIKE $${values.length}`);
    }
    if (year) {
      values.push(Number(year));
      conditions.push(`year = $${values.length}`);
    }
    if (min_price) {
      values.push(Number(min_price));
      conditions.push(`price >= $${values.length}`);
    }
    if (max_price) {
      values.push(Number(max_price));
      conditions.push(`price <= $${values.length}`);
    }
    if (search) {
      values.push(`%${String(search)}%`);
      conditions.push(`product_display_name ILIKE $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Si estamos buscando por ID, solo devolver ese producto
    const limit = id ? "LIMIT 1" : "LIMIT 100";
    const orderBy = id ? "" : "ORDER BY master_category, article_type, product_display_name";

    const query = `
      SELECT
        id,
        gender,
        master_category,
        sub_category,
        article_type,
        base_colour,
        season,
        year,
        usage,
        product_display_name,
        image_url,
        price,
        stock
      FROM products
      ${whereClause}
      ${orderBy}
      ${limit};
    `;

    console.log('Products API - Query:', query.replace(/\s+/g, ' '));
    console.log('Products API - Values:', values);

    const result = await pool.query(query, values);
    console.log('Products API - Results count:', result.rows.length);
    if (id && result.rows.length > 0) {
      console.log('Products API - Found product:', result.rows[0].id, result.rows[0].product_display_name);
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Error fetching products" });
  }
});

