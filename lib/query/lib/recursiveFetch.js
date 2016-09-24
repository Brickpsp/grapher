import applyProps from './applyProps.js';
import createSearchFilters from '../../links/lib/createSearchFilters.js';
import LinkResolve from '../../links/linkTypes/linkResolve.js';
import sift from 'sift';

export default function fetch(node, parentObject, userId) {
    let {filters, options} = applyProps(node);

    let results = [];

    if (parentObject) {
        if (node.linker.isResolver()) {
            let accessor = node.linker.createLink(parentObject, node.collection);
            accessor.object = node.parent.collection.findOne(parentObject._id);

            results = accessor.fetch(filters, options, userId);
        } else {
            const strategy = node.linker.strategy;
            const isVirtual = node.linker.isVirtual();
            const fieldStorage = node.linker.linkStorageField;

            _.extend(filters, createSearchFilters(parentObject, fieldStorage, strategy, isVirtual));

            results = node.collection.find(filters, options, userId).fetch();
        }
    } else {
        results = node.collection.find(filters, options, userId).fetch();
    }

    _.each(results, result => {
        _.each(node.collectionNodes, collectionNode => {
            result[collectionNode.linkName] = fetch(collectionNode, result, userId);
            //delete result[node.linker.linkStorageField];
        })
    });

    return results;
}
