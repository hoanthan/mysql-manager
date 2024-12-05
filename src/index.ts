
import fs from 'node:fs'
import { spawn } from 'node:child_process';
import path from 'node:path'
import mysql from 'mysql2/promise'
import cron from 'node-cron'
import {uploadDumpFile} from "./s3";
import {env} from "./config";

const DB_HOST = env.DB_HOST || ''
const DB_USER = env.DB_USER || ''
const DB_PASS = env.DB_PASS || ''
const DB_PORT = env.DB_PORT ? parseInt(env.DB_PORT) : undefined

async function exists(f: string) {
    try {
        await fs.promises.stat(f);
        return true;
    } catch {
        return false;
    }
}

async function run() {
    const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASS,
    })
    try {
        // execute will internally call prepare and query
        const [results]: any = await connection.execute(
            'SHOW DATABASES'
        );

        const databases = results.map((item: any) => item.Database)

        for (const db of databases) {
            const dumpFilePath = path.resolve(process.cwd(), '../dumps', `./${db}.sql`);

            if (!(await exists(dumpFilePath))) {
                await fs.promises.writeFile(dumpFilePath, '', 'utf8');
            }

            const wstream = fs.createWriteStream(dumpFilePath, 'utf8');
            const mysqldump = spawn('mysqldump', [
                '-u',
                DB_USER,
                `-p${DB_PASS}`,
                db,
            ])
            mysqldump
                .stdout
                .pipe(wstream)
                .on('finish', async function () {
                    await uploadDumpFile(dumpFilePath)
                    console.log('Completed', db)
                    fs.unlink(dumpFilePath, (err) => {
                        if (err) console.error(err)
                    })
                })
                .on('error', function (err) {
                    console.error(err, db)
                });
        }
    } catch (err) {
        console.error(err);
    } finally {
        connection.end();
    }
}

// runs every day at 00:00 UTC
cron.schedule('0 0 * * *', run)

// run on start
run()
