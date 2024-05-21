import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { LocalSettingsService } from './local-settings.service';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    constructor(private localSettingsService: LocalSettingsService) {
    }

    store(key: string, data: any) {
        this.setString(key, JSON.stringify(data));
    }

    retrieve(key: string): Promise<any> {
        var promise = this.getString(key);
        return promise.then(str => str ? this.parseWithDate(str) : null);
    }

    private setString(key: string, str: string): Promise<any> {
        if (environment.envName == "browser"){
            localStorage[key] = str;
            if (navigator.storage && navigator.storage.persist != null) {
                navigator.storage.persist();
            }
            return Promise.resolve();
        } else if (environment.envName == "desktop"){
            return (<any>window).electronBridge.save(key, str);
        } else if (environment.envName == "hosted"){
            var secret = this.localSettingsService.getValue("authKey") || ""; 
            return this.saveToHosted(key, str, secret);
        } else {
            throw 'unknown envName: ' + environment.envName;
        }
    }

    private getString(key: string): Promise<string | undefined> {
        if (environment.envName == "browser"){
            return Promise.resolve(localStorage[key]);
        } else if (environment.envName == "desktop"){
            return (<any>window).electronBridge.load(key);
        } else if (environment.envName == "hosted"){
            return window.fetch(`/load?filename=${encodeURIComponent(key)}`).then(z => z.text());
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

    private saveToHosted(filename: string, data: string, authKey: string): Promise<any>{
        let headers: any = {'Content-Type': 'text/plain'};
        if (authKey) {
            headers.Authorization = authKey;
        }
        return window.fetch(`/save?filename=${encodeURIComponent(filename)}`, { method: 'POST', headers: headers, body: data })
            .then(res => {
                if (res.status == 401){
                    let message = authKey 
                        ? "Failed to save: the provided AUTHKEY didn't work: Enter a new AUTHKEY" 
                        : "Failed to save: the server requires an AUTHKEY to save. Enter it below";
                    let newAuthKey = prompt(message)
                    if (newAuthKey){
                        return this.saveToHosted(filename, data, newAuthKey)
                    }
                }
                else if (res.status >= 400){
                    alert("Failed to save. The server responded with code " + res.status);
                } else if (authKey) {
                    this.localSettingsService.setValue("authKey", authKey); 
                }
                return null;
            });
    }
}