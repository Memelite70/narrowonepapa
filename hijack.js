(function() {
    'use strict';
        
    const REDIRECT_MAP = [
        { match: 'mapsConfig',          redirect: '/narrow/mapsConfig' },
        { match: 'promosConfig',          redirect: '/narrow/promosConfig' },
        { match: 'auth/guestAccountData',          redirect: '/narrow/guestAccountData' },
        { match: '/config/', redirect: '/n1.assets/config/', partial: true },

    ];

    function getRedirectRule(url) {
        if (typeof url !== 'string') return null;
        for (let i = 0; i < REDIRECT_MAP.length; i++) {
            if (url.includes(REDIRECT_MAP[i].match)) {
                return REDIRECT_MAP[i];
            }
        }
        return null;
    }

    function applyRedirect(url, rule) {
        if (rule.partial) {
            return url.replace(rule.match, rule.redirect);
        }
        return rule.redirect;
    }

    const nativeFetch = window.fetch;
    
    const fetchProxy = new Proxy(nativeFetch, {
        apply(target, thisArg, argumentsList) {
            let [resource, config] = argumentsList;

            if (typeof resource === 'string') {
                const rule = getRedirectRule(resource);
                if (rule) {
                    const newUrl = applyRedirect(resource, rule);
                    console.log(`[Fetch Interceptor] Matched "${rule.match}". Redirecting: ${resource} -> ${newUrl}`);
                    argumentsList[0] = newUrl;
                }
            } 
            else if (resource instanceof Request) {
                const rule = getRedirectRule(resource.url);
                if (rule) {
                    const newUrl = applyRedirect(resource.url, rule);
                    console.log(`[Fetch Interceptor] Matched "${rule.match}". Redirecting Request: ${resource.url} -> ${newUrl}`);
                    argumentsList[0] = new Request(newUrl, resource);
                }
            }
            else if (resource instanceof URL) {
                const rule = getRedirectRule(resource.href);
                if (rule) {
                    const newUrl = applyRedirect(resource.href, rule);
                    console.log(`[Fetch Interceptor] Matched "${rule.match}". Redirecting URL Object: ${resource.href} -> ${newUrl}`);
                    argumentsList[0] = newUrl; 
                }
            }

            return Reflect.apply(target,
                 thisArg, 
                 argumentsList);
        }
    });

    try {
        Object.defineProperty(window, 'fetch', {
            value: fetchProxy,
            writable: false,      
            configurable: false   
        });
    } catch (e) {
        window.fetch = fetchProxy; 
    }

    const nativeXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        const rule = getRedirectRule(url);
        if (rule) {
            const newUrl = applyRedirect(url, rule);
            console.log(`[XHR Interceptor] Matched "${rule.match}". Redirecting: ${url} -> ${newUrl}`);
            url = newUrl;
        }
        return nativeXHROpen.call(this, method, url, ...rest);
    };

    try {
        Object.defineProperty(XMLHttpRequest.prototype, 'open', {
            value: XMLHttpRequest.prototype.open,
            writable: false,
            configurable: false
        });
    } catch (e) {}

    const nativeSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if ((name === 'src' || name === 'href' || name === 'poster') && typeof value === 'string') {
            const rule = getRedirectRule(value);
            if (rule) {
                const newValue = applyRedirect(value, rule);
                console.log(`[DOM setAttribute] Matched "${rule.match}". Redirecting: ${value} -> ${newValue}`);
                return nativeSetAttribute.call(this, name, newValue);
            }
        }
        return nativeSetAttribute.call(this, name, value);
    };


    function hookDOMProperty(ElementType, propertyName) {
        const descriptor = Object.getOwnPropertyDescriptor(ElementType.prototype, propertyName);
        if (!descriptor || !descriptor.set) return;

        const nativeSetter = descriptor.set;

        Object.defineProperty(ElementType.prototype, propertyName, {
            set(value) {
                if (typeof value === 'string') {
                    const rule = getRedirectRule(value);
                    if (rule) {
                        const newValue = applyRedirect(value, rule);
                        console.log(`[DOM Property .${propertyName}] Matched "${rule.match}". Redirecting: ${value} -> ${newValue}`);
                        return nativeSetter.call(this, newValue);
                    }
                }
                return nativeSetter.call(this, value);
            },
            get() {
                return descriptor.get ? descriptor.get.call(this) : undefined;
            },
            configurable: true 
        });
    }

    hookDOMProperty(HTMLImageElement, 'src');
    hookDOMProperty(HTMLScriptElement, 'src');
    hookDOMProperty(HTMLLinkElement, 'href');
    hookDOMProperty(HTMLSourceElement, 'src');
    hookDOMProperty(HTMLMediaElement, 'src');

})();
(function() {
    const _OriginalWebSocket = window.WebSocket;
    function PatchedWebSocket(url, protocols) {
        if (typeof url === 'string' && /wss?:\/\/ws[^.]+\.narrow-one\.com/.test(url)) {
            const match = url.match(/wss?:\/\/(ws[^.]+)\.narrow-one\.com(.*)/);
            if (match) {
                const subdomain = match[1]; // e.g., ws4-167-99-228-42
                const path = match[2];      // e.g., /ws
                
                const patched = (location.protocol === 'https:' ? 'wss' : 'ws')
                    + '://' + location.host + '/narrow/game/' + subdomain + path;
                    console.log(`wss://${subdomain}.narrow-one.com${path} to ${patched} ligga`)
                url = patched;
            }
        }
        if (protocols !== undefined) {
            return new _OriginalWebSocket(url, protocols);
        }
        return new _OriginalWebSocket(url);
    }
    PatchedWebSocket.prototype = _OriginalWebSocket.prototype;
    PatchedWebSocket.CONNECTING = _OriginalWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = _OriginalWebSocket.OPEN;
    PatchedWebSocket.CLOSING = _OriginalWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = _OriginalWebSocket.CLOSED;
    window.WebSocket = PatchedWebSocket;
})();