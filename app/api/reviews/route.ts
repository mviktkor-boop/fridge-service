import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Review = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  status: "pending" | "approved";
};

function dataPath() {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "reviews.json");
  return { dir, file };
}

function readAll(): Review[] {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
    return [];
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr as Review[];
  } catch {
    fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
}

export async function GET() {
  const all = readAll()
    .filter((r) => r.status === "approved")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  return NextResponse.json({ ok: true, reviews: all }, { status: 200 });
}
