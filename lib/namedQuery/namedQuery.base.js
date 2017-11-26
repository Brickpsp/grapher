import deepClone from 'lodash.cloneDeep';

export default class NamedQueryBase {
    constructor(name, collection, body, params = {}) {
        this.queryName = name;

        this.body = deepClone(body);
        Object.freeze(this.body);

        this.subscriptionHandle = null;
        this.params = params;
        this.collection = collection;
        this.isExposed = false;
    }

    get name() {
        return `named_query_${this.queryName}`;
    }

    setParams(params) {
        this.params = _.extend({}, this.params, params);

        return this;
    }

    clone(newParams) {
        let clone = new this.constructor(
            this.queryName,
            this.collection,
            deepClone(this.body),
            _.extend({}, deepClone(this.params), newParams)
        );

        clone.cacher = this.cacher;

        return clone;
    }
}