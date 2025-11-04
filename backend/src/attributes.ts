import { Router, Request, Response } from "express";
import { pool } from "./db.js";

export const attributesRouter = Router();

/**
 * GET /api/attributes
 * GET /api/attributes?category=Accessories&type=Handbags
 * Devuelve todos los atributos disponibles (colores, géneros, temporadas, usos)
 * Opcionalmente filtrado por categoría y/o tipo de artículo
 */
attributesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { category, type } = req.query;
    
    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    
    if (category) {
      values.push(String(category));
      conditions.push(`master_category ILIKE $${values.length}`);
    }
    
    if (type) {
      values.push(String(type));
      conditions.push(`article_type ILIKE $${values.length}`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query for all distinct attribute values
    const colorsSql = `SELECT DISTINCT base_colour as value FROM products ${whereClause} AND base_colour IS NOT NULL ORDER BY base_colour;`;
    const gendersSql = `SELECT DISTINCT gender as value FROM products ${whereClause} AND gender IS NOT NULL ORDER BY gender;`;
    const seasonsSql = `SELECT DISTINCT season as value FROM products ${whereClause} AND season IS NOT NULL ORDER BY season;`;
    const usagesSql = `SELECT DISTINCT usage as value FROM products ${whereClause} AND usage IS NOT NULL ORDER BY usage;`;
    
    const [colors, genders, seasons, usages] = await Promise.all([
      pool.query(colorsSql, values),
      pool.query(gendersSql, values),
      pool.query(seasonsSql, values),
      pool.query(usagesSql, values)
    ]);

    res.json({
      colors: colors.rows.map(r => r.value),
      genders: genders.rows.map(r => r.value),
      seasons: seasons.rows.map(r => r.value),
      usages: usages.rows.map(r => r.value)
    });
  } catch (err) {
    console.error("Error fetching attributes:", err);
    res.status(500).json({ error: "Error fetching attributes" });
  }
});

