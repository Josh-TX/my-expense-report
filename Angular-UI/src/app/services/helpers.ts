export function roundToCent(num: number): number{
    return Math.round(num * 100) / 100;
}

export function removeFloatArtifact(num: number): number{
    if (num < 9000000000){ //max safe integer is 9,007,199,254,740,992 (9 quadrillion). Therefore 9 billion * 1 million stays in range
        return Math.round(num * 1000000) / 1000000;
    }
    return Math.round(num * 100) / 100;
}

export function getSum(nums: number[]): number{
    return removeFloatArtifact(nums.reduce((a, b) => a + b, 0));
}

export function getSD(nums: number[], sum?: number | undefined): number | undefined {
    if (!nums.length){
        return undefined;
    }
    var mean = (sum == null ? getSum(nums) : sum) / nums.length
    return Math.sqrt(nums.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / nums.length)
}

export function getCombinedSet(sets: Array<{n: number, sum: number, sd?: number | undefined}>): {n: number, sum: number, sd?: number | undefined} {
    if (!sets.length){
        return {
            n: 0,
            sum: 0,
        };
    }
    if (sets.length == 1){
        return { ...sets[0] };
    }
    var combinedN = getSum(sets.map(z => z.n));
    var combinedSum = getSum(sets.map(z => z.sum));
    var combinedMean = combinedSum/combinedN;
    var weightedSumVariance = getSum(sets.map(z => z.sd == null ? 0 : z.n * z.sd * z.sd)) / combinedN;
    var weightedSumSquaredDeviation = getSum(sets.map(z => z.n * Math.pow(z.n / z.sum - combinedMean, 2))) / combinedN;
    var combinedSd = Math.sqrt(weightedSumVariance + weightedSumSquaredDeviation);
    return {
        n: combinedN,
        sum: combinedSum,
        sd: combinedSd
    };
}


//solution from https://stackoverflow.com/questions/50851263
type FilterProperties<T, TFilter> = { [K in keyof T as (T[K] extends TFilter ? K : never)]: T[K] }
export function getSumByProp<T>(items: T[], key: keyof FilterProperties<T, number>): number{
    //typescript can't figure out that T[key] is a number, so cast to <any>
    return items.reduce((a, b) => a + (<any>b[key]), 0);
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
        return z2 instanceof Date && z1.getTime() == z2.getTime();
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
export function groupBy<T, U>(items: T[], selectorFunc: (t1: T) => U): Group<T,U>[]{
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

export function sortBy<T>(items: T[], selectorFunc: (t:T) => number){
    items.sort((t1, t2) => selectorFunc(t1) - selectorFunc(t2));
}

export function sortByDesc<T>(items: T[], selectorFunc: (t:T) => number){
    items.sort((t1, t2) => selectorFunc(t2) - selectorFunc(t1));
}