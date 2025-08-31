import fs, { type PathLike } from "fs"

export interface ZoneSave {
    farmDustPerSec?: number,
    farmItems?: string[]
    pushEnemiesPerMin?: number,
    pushItems?: string[]
}

export type Save = { [key: string]: (ZoneSave) }


export function writeSave(path: PathLike, save: Save) {
    if(!verifySave(save)){
        console.log(JSON.stringify(save));
        throw Error("Invalid save data passed to writer, skipping write to avoid data corruption.");
    }
    fs.writeFileSync(path, JSON.stringify(save, null, 2));
}

export function readSave(path: PathLike): Save {
    let save;
    if (fs.existsSync(path)) {
        save = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));
    } else {
        save = {};
    }
    if(!verifySave(save)){
        throw Error("Invalid save file found.");
    }

    return save;
}


export function verifySave(obj: object): obj is Save {

    return obj && Object.entries(obj).every(([key, value]) => {
        const keyNum = Number(key);
        if (Number.isNaN(keyNum) || keyNum <= 0) {
            return false;
        }
        // Value must be an object
        if (typeof value !== 'object' || value === null) {
            return false;
        }

        const zone = value as ZoneSave;

        // farmDustPerSec: must be a number if present
        if ('farmDustPerSec' in zone &&
            (typeof zone.farmDustPerSec !== 'number' || zone.farmDustPerSec < 0)) {
            return false;
        }

        // farmItems: must be an array of strings if present
        if ('farmItems' in zone) {
            if (!Array.isArray(zone.farmItems) ||
                !zone.farmItems.every(item => typeof item === 'string')) {
                return false;
            }
        }

        // pushEnemiesPerMin: must be a number if present
        if ('pushEnemiesPerMin' in zone &&
            (typeof zone.pushEnemiesPerMin !== 'number' || zone.pushEnemiesPerMin < 0)) {
            return false;
        }

        // pushItems: must be an array of strings if present
        if ('pushItems' in zone) {
            if (!Array.isArray(zone.pushItems) ||
                !zone.pushItems.every(item => typeof item === 'string')) {
                return false;
            }
        }

        return true;
    });
}