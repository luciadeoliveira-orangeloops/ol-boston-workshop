import { Router, Request, Response } from "express";
import { pool } from "./db.js";

export const attributesRouter = Router();

/**
 * GET /api/attributes
 * GET /api/attributes?master_category=Accessories
 * Devuelve todos los atributos disponibles (colores, géneros, temporadas, usos, subcategorías, tipos)
 * Opcionalmente filtrado por master_category
 */
attributesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { master_category } = req.query;
    
    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    
    if (master_category) {
      values.push(String(master_category));
      conditions.push(`master_category ILIKE $${values.length}`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query for all distinct attribute values
    const coloursSql = `SELECT DISTINCT base_colour as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} base_colour IS NOT NULL ORDER BY base_colour;`;
    const gendersSql = `SELECT DISTINCT gender as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} gender IS NOT NULL ORDER BY gender;`;
    const seasonsSql = `SELECT DISTINCT season as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} season IS NOT NULL ORDER BY season;`;
    const usagesSql = `SELECT DISTINCT usage as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} usage IS NOT NULL ORDER BY usage;`;
    const masterCategoriesSql = `SELECT DISTINCT master_category as value FROM products WHERE master_category IS NOT NULL ORDER BY master_category;`;
    const subCategoriesSql = `SELECT DISTINCT sub_category as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} sub_category IS NOT NULL ORDER BY sub_category;`;
    const articleTypesSql = `SELECT DISTINCT article_type as value FROM products ${whereClause}${whereClause ? ' AND' : 'WHERE'} article_type IS NOT NULL ORDER BY article_type;`;
    
    const [colours, genders, seasons, usages, masterCategories, subCategories, articleTypes] = await Promise.all([
      pool.query(coloursSql, values),
      pool.query(gendersSql, values),
      pool.query(seasonsSql, values),
      pool.query(usagesSql, values),
      pool.query(masterCategoriesSql),
      pool.query(subCategoriesSql, values),
      pool.query(articleTypesSql, values)
    ]);

    res.json({
      colours: colours.rows.map(r => r.value),
      genders: genders.rows.map(r => r.value),
      seasons: seasons.rows.map(r => r.value),
      usages: usages.rows.map(r => r.value),
      master_categories: masterCategories.rows.map(r => r.value),
      sub_categories: subCategories.rows.map(r => r.value),
      article_types: articleTypes.rows.map(r => r.value)
    });
  } catch (err) {
    console.error("Error fetching attributes:", err);
    res.status(500).json({ error: "Error fetching attributes" });
  }
});

