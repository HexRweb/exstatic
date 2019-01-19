# Exstatic source-base

A convenience class for Exstatic designed to make creating external source plugins easier

# Example

```js
const url = require('url');
// Note: this package has not been released on npm (yet)!
const SourceBase = require('@exstatic/source-base');

class MySourceFetcher extends SourceBase {
    constructor() {
        super();

        this.baseURL = 'https://api.example.com';
    }

    configure(options) {
        if (!options.key) {
            throw new Error('API Key must be provided');
        }

        this.options = options;
    }

    get name() {
        return 'MySource';
    }

    async run({fn, hash = {}}) {
        const {endpoint} = hash;
        // Yes, you still have access to your instance!
        const requestURL = url.resolve(this.baseURL, `/${endpoint || 'endpoint'}`);
        const {data} = await this.request(requestURL, {
            headers: {
                authorization: `Bearer ${this.key}`
            }
        });

        return fn(data);
    }
}

// Make sure you instantiate the class!
module.exports = new MySourceFetcher();
```

Taking the above plugin, here's how you might use it in a page:

```hbs
---
title: 'About Alice'
---
{{#MySource endpoint="person/alice"}}
	{{name}} was born on {{birthday}} in {{hometown}} to {{mother}} and {{father}}
{{/MySource}}
```

# API

The SourceBase that is exported is an _abstract class_ - certain methods need to be implemented or you will get a run time error.

Methods to implement:

 - `get name() {}` - the name of your source. This will be used as the handlebars helper name
 - `configure() {}` - initialize the instance with specific data - e.g. access tokens, URLs, etc. This will be passed in to exstatic via the config file
 - `async run() {}` - the function that gets executed when the helper is called. The values are passed directly to this function so the arguments will be the same as any handlebars helper would get

You also have access to an [axios](https://www.npmjs.com/package/axios) instance via `this.request` to HTTP requests if needed. Please consult their [API documentation](https://www.npmjs.com/package/axios#axios-api) for usage instructions. While you can import another library to make requests, it's highly suggested you just use the provided axios instance if possible.