import fs from 'fs';
import { fileURLToPath } from 'url';
import path from "path";
import multer from "multer";

declare module "express-serve-static-core" {
    interface Request {
        folder?: string;
        company_id?: number;
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const company_id = req.company_id;
        const folder = req?.folder || 'default';

        const upload_path = path.join(__dirname, '../../uploads', `company_${company_id}`, `${folder}`);

        if (!fs.existsSync(upload_path)) fs.mkdirSync(upload_path, { recursive: true });
        cb(null, upload_path);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });