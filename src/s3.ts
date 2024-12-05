import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import path from "node:path";
import fs from "node:fs";
import {env} from "./config";
import {format} from "date-fns";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY!,
        secretAccessKey: env.AWS_SECRET_KEY!,
    },
    region: env.AWS_REGION
});

export async function uploadDumpFile(filePath: string) {
    const bucketName = env.S3_DB_DUMP_BUCKET ?? '';
    const fileName= path.basename(filePath);
    const folder = format(new Date, 'yyyy-MM-dd');

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: `${folder}/${fileName}`,
            Body: fs.createReadStream(filePath),
            ContentEncoding: 'utf-8',
            ContentType: 'application/sql',
        })
    )
}
