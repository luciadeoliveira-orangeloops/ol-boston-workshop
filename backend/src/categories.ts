import { Router, Request, Response } from "express";
import { pool } from "./db.js";

export const categoriesRouter = Router();

/**
 * GET /api/categories
 * Devuelve todas las categorías principales (master_category) disponibles
 */
categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const sql = `SELECT DISTINCT master_category FROM products ORDER BY master_category;`;
    const { rows } = await pool.query(sql);
    res.json(rows.map(r => r.master_category));
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Error fetching categories" });
  }
});

/**
 * GET /api/categories/types?category=Accessories
 * Devuelve los tipos de artículos (article_type) disponibles, opcionalmente filtrados por categoría
 */
categoriesRouter.get("/types", async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    let sql = `
      SELECT DISTINCT 
        master_category, 
        article_type,
        COUNT(*) as product_count
      FROM products
    `;
    
    const values: any[] = [];
    
    if (category) {
      values.push(String(category));
      sql += ` WHERE master_category ILIKE $1`;
    }
    
    sql += ` GROUP BY master_category, article_type ORDER BY master_category, article_type;`;
    
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching product types:", err);
    res.status(500).json({ error: "Error fetching product types" });
  }
});

