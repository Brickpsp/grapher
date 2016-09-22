import LinkMany from './linkTypes/linkMany.js';
import LinkManyMeta from './linkTypes/linkManyMeta.js';
import LinkOne from './linkTypes/linkOne.js';
import LinkOneMeta from './linkTypes/linkOneMeta.js';
import LinkResolve from './linkTypes/linkResolve.js';
import {linkStorage as linkStorageSymbol} from './symbols.js';
import ConfigSchema from './config.schema.js';
import createFieldSchema from './lib/createFieldSchema.js';
import smartArguments from './linkTypes/lib/smartArguments';

export default class Linker {
    /**
     * @param mainCollection
     * @param linkName
     * @param linkConfig
     */
    constructor(mainCollection, linkName, linkConfig)
    {
        this.mainCollection = mainCollection;
        this.linkConfig = linkConfig;
        this.linkName = linkName;

        // check linkName must not exist in schema
        this._validateAndClean();
        this._extendSchema();

        // if it's a virtual field make sure that when this is deleted, it will be removed from the references
        if (this.isVirtual()) {
            this._handleReferenceRemovalForVirtualLinks();
        } else {
            this._initIndex();
            this._initAutoremove();
        }
    }

    /**
     * Values which represent for the relation a single link
     * @returns {string[]}
     */
    get oneTypes()
    {
        return ['one', '1', 'single'];
    }

    /**
     * Returns the strategies: one, many, one-meta, many-meta
     * @returns {string}
     */
    get strategy()
    {
        if (this.isResolver()) {
            return 'resolver';
        }

        let strategy = this.isMany() ? 'many' : 'one';
        if (this.linkConfig.metadata) {
            strategy += '-meta';
        }

        return strategy;
    }

    /**
     * Returns the field name in the document where the actual relationships are stored.
     * @returns string
     */
    get linkStorageField()
    {
        if (this.isVirtual()) {
            return this.linkConfig.relatedLinker.linkStorageField;
        }

        return this.linkConfig.field;
    }

    /**
     * The collection that is linked with the current collection
     * @returns Mongo.Collection
     */
    getLinkedCollection()
    {
        // if our link is a resolver, then we really don't have a linked collection.
        if (this.isResolver()) {
            return null;
        }

        return this.linkConfig.collection;
    }

    /**
     * If the relationship for this link is of "many" type.
     */
    isMany()
    {
        return !this.isSingle();
    }

    /**
     * If the relationship for this link contains metadata
     */
    isMeta()
    {
        return !!this.linkConfig.metadata;
    }

    /**
     * @returns {boolean}
     */
    isSingle()
    {
        return _.contains(this.oneTypes, this.linkConfig.type);
    }

    /**
     * @returns {boolean}
     */
    isVirtual()
    {
        return !!this.linkConfig.inversedBy;
    }

    /**
     * @returns {boolean}
     */
    isResolver()
    {
        return _.isFunction(this.linkConfig.resolve);
    }

    /**
     * @param object
     * @returns {*}
     */
    createLink(object, collection)
    {
        let helperClass = this._getHelperClass();

        return new helperClass(this, object, collection);
    }

    /**
     * @returns {*}
     * @private
     */
    _validateAndClean()
    {
        if (!this.isResolver()) {
            if (!this.linkConfig.collection) {
                throw new Meteor.Error('invalid-config', `For the link ${this.linkName} you did not provide a collection. Collection is mandatory for non-resolver links.`)
            }
            if (this.isVirtual()) {
                return this._prepareVirtual();
            } else {
                if (!this.linkConfig.type) {
                    this.linkConfig.type = 'one';
                }

                if (!this.linkConfig.field) {
                    this.linkConfig.field = this._generateFieldName();
                } else {
                    if (this.linkConfig.field == this.linkName) {
                        throw new Meteor.Error('invalid-config', `For the link ${this.linkName} you must not use the same name for the field, otherwise it will cause conflicts when fetching data`);
                    }
                }
            }
        }

        ConfigSchema.validate(this.linkConfig);
    }

    /**
     * We need to apply same type of rules in this case.
     */
    _prepareVirtual()
    {
        const {collection, inversedBy} = this.linkConfig;

        const linker = collection.getLinker(inversedBy);

        _.extend(this.linkConfig, {
            metadata: linker.linkConfig.metadata,
            relatedLinker: linker
        });
    }

    /**
     * Depending on the strategy, we create the proper helper class
     * @private
     */
    _getHelperClass()
    {
        switch (this.strategy) {
            case 'resolver':
                return LinkResolve;
            case 'many-meta':
                return LinkManyMeta;
            case 'many':
                return LinkMany;
            case 'one-meta':
                return LinkOneMeta;
            case 'one':
                return LinkOne;
        }

        throw new Meteor.Error('invalid-strategy', `${this.strategy} is not a valid strategy`);
    }

    /**
     * Extends the schema of the collection.
     * @private
     */
    _extendSchema()
    {
        if (this.isVirtual() || this.isResolver()) {
            return;
        }

        if (this.mainCollection.simpleSchema && this.mainCollection.simpleSchema()) {
            const schema = createFieldSchema(this.isMany(), this.linkConfig.metadata);

            this.mainCollection.attachSchema({
                [this.linkConfig.field]: schema
            });
        }
    }

    /**
     * If field name not present, we generate it.
     * @private
     */
    _generateFieldName()
    {
        let cleanedCollectionName = this.linkConfig.collection._name.replace(/\./g, '_');
        let defaultFieldPrefix = this.linkName + '_' + cleanedCollectionName;

        switch (this.strategy) {
            case 'many-meta':
                return `${defaultFieldPrefix}_metas`;
            case 'many':
                return `${defaultFieldPrefix}_ids`;
            case 'one-meta':
                return `${defaultFieldPrefix}_meta`;
            case 'one':
                return `${defaultFieldPrefix}_id`;
        }
    }

    /**
     * When a link that is declared virtual is removed, the reference will be removed from every other link.
     * @private
     */
    _handleReferenceRemovalForVirtualLinks()
    {
        this.mainCollection.after.remove((userId, doc) => {
            let accessor = this.createLink(doc);

            _.each(accessor.fetch(), linkedObj => {
                const {relatedLinker} = this.linkConfig;
                let link = relatedLinker.createLink(linkedObj);

                if (relatedLinker.isSingle()) {
                    link.unset();
                } else {
                    link.remove(doc);
                }
            });
        })
    }

    _initIndex() {
        if (Meteor.isServer) {
            let field = this.linkConfig.field;
            if (this.linkConfig.metadata) {
                field = field + '._id';
            }

            if (this.linkConfig.index) {
                if (this.isVirtual()) {
                    throw new Meteor.Error('You cannot set index on an inversed link.');
                }

                let options;
                if (this.linkConfig.unique) {
                    if (this.isMany()) {
                        throw new Meteor.Error('You cannot set unique property on a multi field.');
                    }

                    options = {unique: true}
                }

                this.mainCollection._ensureIndex({[field]: 1}, options);
            } else {
                if (this.linkConfig.unique) {
                    if (this.isVirtual()) {
                        throw new Meteor.Error('You cannot set unique property on an inversed link.');
                    }

                    if (this.isMany()) {
                        throw new Meteor.Error('You cannot set unique property on a multi field.');
                    }

                    this.mainCollection._ensureIndex({
                        [field]: 1
                    }, {unique: true})
                }
            }
        }
    }

    _initAutoremove() {
        if (this.linkConfig.autoremove) {
            this.mainCollection.after.remove((userId, doc) => {
                this.getLinkedCollection().remove({
                    _id: {
                        $in: smartArguments.getIds(doc[this.linkStorageField])
                    }
                })
            })
        }
    }
}