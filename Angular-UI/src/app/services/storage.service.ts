import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { LocalSettingsService } from './local-settings.service';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    private _ignore401: boolean = false;
    constructor(private localSettingsService: LocalSettingsService) {
    }

    setIgnore401(ms: number){
        this._ignore401 = true;
        setTimeout(() => {
            this._ignore401 = false;
        }, ms);
    }

    store(key: string, data: any): Promise<any> {
        return this.setString(key, JSON.stringify(data));
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
            var secret = this.localSettingsService.getValue("writeToken") || ""; 
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
            var secret = this.localSettingsService.getValue("readToken") || ""; 
            return this.loadFromHosted(key, secret);
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

    private saveToHosted(filename: string, data: string, token: string): Promise<any>{
        let headers: any = {'Content-Type': 'text/plain'};
        if (token) {
            headers.Authorization = token;
        }
        return window.fetch(`/save?filename=${encodeURIComponent(filename)}`, { method: 'POST', headers: headers, body: data })
            .then(res => {
                if (res.status == 401){
                    if (this._ignore401){
                        return;
                    }
                    let message = token 
                        ? "Failed to save: the provided WRITE_TOKEN was incorrect: Enter a new WRITE_TOKEN" 
                        : "Failed to save: the server requires a WRITE_TOKEN to save. Enter it below";
                    let newToken = prompt(message)
                    if (newToken){
                        return this.saveToHosted(filename, data, newToken)
                    } else {
                        alert("It might look like it saved, but the data will be reverted after a refresh")
                    }
                }
                else if (res.status >= 400){
                    alert("Failed to save. The server responded with code " + res.status);
                    alert("Data not saved. It might look like it saved, but the data will be reverted after a refresh")
                } else if (token) {
                    this.localSettingsService.setValue("writeToken", token); 
                }
                return null;
            });
    }

    private loadFromHosted(filename: string, token: string): Promise<string>{
        let headers: any = {};
        if (token) {
            headers.Authorization = token;
        }
        return window.fetch(`/load?filename=${encodeURIComponent(filename)}`, { headers: headers })
            .then(res => {
                if (res.status == 401){
                    if (token != (this.localSettingsService.getValue("readToken") || "")){
                        //since there's often multiple loads happening in parallel, the user may provide the correct token for one load
                        //By doing this, the user won't even know that other requests got 401ed too, since it'll retry in the background.
                        return this.loadFromHosted(filename, this.localSettingsService.getValue("readToken")!)
                    }
                    let message = token 
                        ? "Failed to load: the provided READ_TOKEN was incorrect: Enter a new READ_TOKEN" 
                        : "Failed to load: the server requires a READ_TOKEN to save. Enter it below";
                    let newToken = prompt(message);
                    if (newToken){
                        this.localSettingsService.setValue("readToken", newToken); 
                    }
                    //we can infinitely request the read_token if it's required
                    return this.loadFromHosted(filename, newToken || "");
                }else if (res.status >= 400){
                    alert("Failed to load. The server responded with code " + res.status);
                    return "";
                } else if (token) {
                    this.localSettingsService.setValue("readToken", token); 
                }
                return res.text();
            });
    }
}