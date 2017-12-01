# API

Use this as a cheatsheet after you have read the full documentation.


- [Adding Links](#adding-links)
- [Adding Reducers](#adding-reducers)
- [Creating Named Queries](#creating-named-queries)
- [Exposing Named Queries](#exposing-named-queries)
- [Using Queries](#using-queries)
- [Caching Named Queries](#caching-named-queries)
- [Creating Global Queries](#creating-global-queries)
- [Exposing Global Queries](#exposing-global-queries)


### Adding Links

```js
Collection.addLinks({
    linkName: {
        collection, // Mongo.Collection
        type, // 'one' or 'many'
        metadata, // Boolean
        field, // String
        denormalize: {
            field, // String
            body, // Body from related collection
        }
    }
})

Collection.addLinks({
    linkName: {
        collection, // Mongo.Collection
        inversedBy, // The link name from the other side 
        denormalize: {
            field, // String
            body, // Body from related collection
        }
    }
})
```

### Adding Reducers

```js
Collection.addReducers({
    reducerName: {
        body, // Object, dependency graph
        compute(object) {
            // anything
        }
    }
})
```

### Creating Named Queries

```js
Collection.createQuery('queryName', {
    $options, // Mongo Options {sort, limit, skip}
    $filters, // Mongo Filters
    $filter({filters, options, params}) {}, // Function or [Function]
    $postOptions, // {limit, sort, skip}
    $postFilters, // any sift() available filters
    $postFilter(results, params) {}, // Function => results, or [Function] => results
    body, // The query body
}, {
    params, // Default parameters
    validateParams, // Object or Function
})
```

### Exposing Named Queries

```js
query.expose({
    firewall(userId, params) {}, // Function or [Function]
    method, // Boolean
    publication, // Boolean
    unblock, // Boolean
    validateParams, // Function or Object
    embody // Object which extends the body server-side securely
})
```

### Creating and Exposing Resolvers

```js
// both
const query = createQuery('queryName', () => {});

// server
query.expose({
    firewall, // Function or [Function]
});

query.resolve(function (params) {
    // this.userId
    return [];
});
```

### Using Queries

```js
query.setParams({}) // extends current params
```

#### Server-Side
```js
query.clone({params}).fetch();
query.clone({params}).fetchOne();
query.clone({params}).getCount();
```

#### Client-Side

Static:
```js
query.clone({params}).fetch((err, res) => {});
query.clone({params}).fetchOne((err, res) => {});
query.clone({params}).getCount((err, res) => {});
```

Reactive:
```js
const query = userListQuery.clone({params});

const handle = query.subscribe(); // handle.ready()
const data = query.fetch();
const oneData = query.fetchOne();

const handleCount = query.subscribeCount();
const count = query.getCount();
```

#### Caching Named Queries
```js
import {MemoryResultCacher} from 'meteor/cultofcoders:grapher';

// server-side
query.cacheResults(new MemoryResultCacher({
    ttl: 60 * 1000, // 60 seconds
}))
```

#### Creating Global Queries

```js
Collection.createQuery({
    $options, // Mongo Options {sort, limit, skip}
    $filters, // Mongo Filters
    $filter({filters, options, params}) {}, // Function or [Function]
    $postOptions, // {limit, sort, skip}
    $postFilters, // any sift() available filters
    $postFilter, // Function => results, or [Function] => results
    body, // the rest of the object
})
```

#### Exposing Global Queries

```js
Collection.expose({
    firewall(filters, options, userId) {}, // Function or [Function] 
    publication, // Boolean
    method, // Boolean
    blocking, // Boolean
    maxLimit, // Number 
    maxDepth, // Number
    restrictedFields, // [String]
    restrictLinks, // [String] or Function,
    body, // Object or Function(userId) => Object
});
```