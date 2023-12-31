import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() { 
  }

  store(key: string, data: any) {
    localStorage[key] = JSON.stringify(data);
    if (navigator.storage && navigator.storage.persist != null){
      navigator.storage.persist();
    }
  }

  retrieve(key: string): any {
    var str = localStorage[key];
    return str 
      ? this.parseWithDate(str)
      : null;
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