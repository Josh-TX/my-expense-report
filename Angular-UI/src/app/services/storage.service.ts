import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    constructor() {
    }

    store(key: string, data: any) {
        this.setString(key, JSON.stringify(data));
    }

    retrieve(key: string): Promise<any> {
        var promise = this.getString(key);
        return promise.then(str => str ? this.parseWithDate(str) : null);
    }

    private setString(key: string, str: string) {
        if (environment.envName == "browser"){
            localStorage[key] = str;
            if (navigator.storage && navigator.storage.persist != null) {
                navigator.storage.persist();
            }
        } else if (environment.envName == "desktop"){
            (<any>window).electronBridge.save(key, str)
        } else {
            throw 'unknown envName: ' + environment.envName;
        }
    }

    private getString(key: string): Promise<string | undefined> {
        if (environment.envName == "browser"){
            return Promise.resolve(localStorage[key]);
        } else if (environment.envName == "desktop"){
            return (<any>window).electronBridge.load(key)
        } else {
            throw 'unknown envName: ' + environment.envName;
        }
    }

    private parseWithDate(jsonString: string): any {
        var dateRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;
        var resultObject = JSON.parse(jsonString, (key: any, value: any) => {
            if (typeof value == 'string' && (dateRegex.exec(value))) {
                return new Date(value);
            }
            return value;
        });
        return resultObject;
    }
}

export enum EnvNames {
    BrowserOnly,
    Hosted,
    Desktop
}