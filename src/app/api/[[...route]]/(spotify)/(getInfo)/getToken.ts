import { Hono } from "hono";
import axios from "axios";
import { getCookie } from "hono/cookie";
import dotenv from "dotenv";

dotenv.config();

const app = new Hono();

app.get("/", async (c) => { });


