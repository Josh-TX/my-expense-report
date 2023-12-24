export function roundToCent(num: number): number{
    return Math.round(num * 100) / 100;
}

export function getSum(nums: number[]): number{
    return nums.reduce((a, b) => a + b, 0);
}

//solution from https://stackoverflow.com/questions/50851263
type FilterProperties<T, TFilter> = { [K in keyof T as (T[K] extends TFilter ? K : never)]: T[K] }
export function getSumByProp<T>(items: T[], key: keyof FilterProperties<T, number>): number{
    //typescript can't figure out that T[key] is a number, so cast to <any>
    return items.reduce((a, b) => a + (<any>b[key]), 0);
}

export type Stat = {
    n: number,
    sum: number,
    mean: number,
    sd?: number | undefined
}

export function getStat(amounts: number[]): Stat {
    if (!amounts.length) {
        return {
            n: 0,
            mean: 0,
            sum: 0
            //sd undefined
        };
    }
    if (!amounts.length || amounts.length == 1) {
        return {
            n: 1,
            mean: amounts[0],
            sum: amounts[0],
            //sd undefined
        };
    }
    var n = amounts.length
    var sum = getSum(amounts);
    var mean = sum / n
    var sd = Math.sqrt(amounts.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    return { 
        n, 
        sum: sum,
        mean: roundToCent(mean), 
        sd 
    };
}

export function getStatByProp<T>(items: T[], key: keyof FilterProperties<T, number>): Stat{
    return getStat(items.map(z => <any>z[key]))
}

export function getCombinedStat(stats: Stat[]): Stat {
    stats = stats.filter(z => z.n > 0);
    if (!stats.length){
        return {
            n: 0,
            mean: 0,
            sum: 0
            //sd undefined
        };
    }
    if (stats.length == 1){
        return stats[0];
    }
    var n = getSum(stats.map(z => z.n));
    var sum = getSum(stats.map(z => z.sum));
    var mean = sum/n;
    var weightedSumVariance = getSum(stats.map(z => z.sd == null ? 0 : z.n * z.sd * z.sd));
    var weightedSumSquaredDeviation = getSum(stats.map(z => z.n * Math.pow(z.mean - mean, 2)));
    var sd = Math.sqrt((weightedSumVariance + weightedSumSquaredDeviation) / n);
    return { 
        n, 
        sum: sum,
        mean: roundToCent(mean), 
        sd 
    };
}


/** uses areValuesSame for equality checks */
export function getDistinct<T>(items: T[]): T[]{
    return items.filter((item, i) => items.findIndex(z => areValuesSame(item, z)) == i);
}

/** uses areValuesSame for equality checks */
export function getDistinctByProp<K extends keyof T, T>(items: T[], prop: K): T[]{
    return items.filter((item, i) => items.findIndex(z => areValuesSame(z[prop], item[prop])) == i);
}

/** uses areValuesSame for equality checks */
export function getDistinctBySelectorFunc<K extends keyof T, T>(items: T[], selectorFunc: (t:T)=>any): T[]{
    return items.filter((item, i) => items.findIndex(z => areValuesSame(selectorFunc(z), selectorFunc(item))) == i);
}

// export function distinctByEqualityFunc<T>(items: T[], equalityFunc: (t1: T, t2: T) => boolean): T[]{
//     return items.filter((item, i) => items.findIndex(z => equalityFunc(item, z)));
// }

/** for objects, compares the values in the object rather than reference equality */
export function areValuesSame(z1: any, z2: any): boolean{
    if (typeof z1 != typeof z2){
        return false;
    }
    if (typeof z1 != "object"){
        return z1 == z2;
    }
    if (!z1 || !z2){ //check for nulls
        return z1 == z2;
    }
    if (z1 instanceof Date){
        return z2.getTime && z1.getTime() == z2.getTime();
    }
    if (Array.isArray(z1)){
        if (z1.length != z2.length){
            return false;
        }
        for (var i = 0; i < z1.length; i++){
            if (!areValuesSame(z1[i], z2[i])){
                return false;
            }
        }
        return true;
    }
    if (Object.keys(z1).length != Object.keys(z2).length){
        return false;
    }
    for (var key in z1){
        if (!areValuesSame(z1[key], z2[key])){
            return false;
        }
    }
    return true;
}

export type Group<T, U> = {
    items: T[]
    key: U,
};

/** uses areValuesSame for equality checks */
export function groupByProp<K extends keyof T, U extends T[K], T>(items: T[], prop: K): Group<T,U>[] {
    var groups: Array<{ key: U, items: T[]}> = [];
    for (var item of items){
        var key = item[prop];
        var foundGroup = groups.find(z => areValuesSame(z.key, key));
        if (foundGroup){
            foundGroup.items.push(item);
        } else {
            //typescript can't figure out that T[K] is U, so cast to <any>
            groups.push({key: <any>key, items: [item]});
        }
    }
    return groups;
}

/** uses areValuesSame for equality checks */
export function groupBySelectorFunc<T, U>(items: T[], selectorFunc: (t1: T) => U): Group<T,U>[]{
    var groups: Array<{ key: U, items: T[]}> = [];
    for (var item of items){
        var key = selectorFunc(item);
        var foundGroup = groups.find(z => areValuesSame(z.key, key));
        if (foundGroup){
            foundGroup.items.push(item);
        } else {
            groups.push({key: key, items: [item]});
        }
    }
    return groups;
}

export function getStartOfMonth(date: Date): Date {
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0)
    d.setDate(1);
    return d;
}