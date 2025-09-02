import type { PathLike } from "fs";
import fs from 'fs';
import type { ZodTypeAny, TypeOf } from "zod/v3";
export class SaveManager<T extends ZodTypeAny> {

    public constructor(private path: PathLike, private schema: T) {}
    
    public write(save: TypeOf<T>) {
        this.writeTo(this.path, save);
    }

    public writeTo(path: PathLike, save: TypeOf<T>) {
        fs.writeFileSync(this.path, JSON.stringify(save, null, 2));
    }

    public read(): TypeOf<T> {
        let save;
        if (fs.existsSync(this.path)) {
            save = JSON.parse(fs.readFileSync(this.path, { encoding: 'utf-8' }));
        } else {
            save = {};
        }

        return this.schema.parse(save);
    }
}