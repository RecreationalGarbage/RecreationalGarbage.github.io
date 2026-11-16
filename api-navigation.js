(function () {
    'use strict';
    const root = new URL('.', document.currentScript.src);
    const key = 'api-navigation:' + root.href;

    function read(storage, name) {
        try { return window[storage].getItem(key + ':' + name); }
        catch (error) { return null; }
    }
    function save(storage, name, value) {
        try { window[storage].setItem(key + ':' + name, value); }
        catch (error) { /* Navigation still works when browser storage is disabled. */ }
    }
    function element(tag, attributes, text) {
        const node = document.createElement(tag);
        Object.entries(attributes || {}).forEach(([name, value]) => node.setAttribute(name, value));
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function init() {
        if (document.getElementById('api-class-pane')) return;
        const pane = element('aside', { id: 'api-class-pane', 'aria-label': 'API class browser' });
        const filters = element('div', { class: 'api-class-filters' });
        const input = element('input', { type: 'search', placeholder: 'Filter classes...', 'aria-label': 'Filter classes' });
        const packages = element('select', { 'aria-label': 'Filter by package' });
        packages.appendChild(element('option', { value: '' }, 'All Packages'));
        filters.append(input, packages);
        const count = element('div', { id: 'api-class-count', role: 'status' }, 'Loading classes...');
        const list = element('nav', { id: 'api-class-list', 'aria-label': 'Classes' });
        pane.append(element('h2', {}, 'API Documentation'), filters, count, list);
        const rail = element('div', { id: 'api-pane-control' });
        const toggle = element('button', { id: 'api-toggle-pane', type: 'button', 'aria-controls': 'api-class-pane' });
        toggle.appendChild(element('span', { 'aria-hidden': 'true' }, '<'));
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        icon.setAttribute('stroke-linecap', 'round');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');
        const circle = document.createElementNS(icon.namespaceURI, 'circle');
        circle.setAttribute('cx', '10.5');
        circle.setAttribute('cy', '10.5');
        circle.setAttribute('r', '6.5');
        const handle = document.createElementNS(icon.namespaceURI, 'path');
        handle.setAttribute('d', 'M15.5 15.5L21 21');
        icon.append(circle, handle);
        toggle.appendChild(icon);
        rail.appendChild(toggle);
        document.body.append(pane, rail);
        const saved = read('localStorage', 'collapsed');
        let collapsed = saved === null ? window.matchMedia('(max-width: 700px)').matches : saved === 'true';

        function updateVisibility() {
            document.documentElement.classList.add('api-navigation');
            document.documentElement.classList.toggle('api-navigation-collapsed', collapsed);
            toggle.setAttribute('aria-expanded', String(!collapsed));
            toggle.title = collapsed ? 'Show class pane' : 'Hide class pane';
            toggle.setAttribute('aria-label', toggle.title);
            window.dispatchEvent(new Event('resize'));
        }
        toggle.addEventListener('click', () => {
            collapsed = !collapsed;
            save('localStorage', 'collapsed', String(collapsed));
            updateVisibility();
        });
        updateVisibility();
        input.value = read('sessionStorage', 'filter') || '';
        let types = [];
        function render() {
            const query = input.value.toLowerCase();
            const matches = types.filter(type => (!packages.value || type.p === packages.value) &&
                (type.p + '.' + type.l).toLowerCase().includes(query));
            const links = matches.map(type => {
                const url = new URL(type.url || type.p.replace(/\./g, '/') + '/' + type.l + '.html', root);
                const link = element('a', { href: url.href, title: type.p + '.' + type.l }, type.l);
                if (url.pathname === window.location.pathname) link.setAttribute('aria-current', 'page');
                return link;
            });
            list.replaceChildren(...links);
            count.textContent = 'Classes (' + matches.length + ')';
        }
        function filterChanged() {
            save('sessionStorage', 'filter', input.value);
            save('sessionStorage', 'package', packages.value);
            save('sessionStorage', 'scroll', '0');
            render();
        }
        input.addEventListener('input', filterChanged);
        packages.addEventListener('change', filterChanged);
        list.addEventListener('scroll', () => save('sessionStorage', 'scroll', String(list.scrollTop)), { passive: true });

        function showTypes() {
            if (!Array.isArray(window.typeSearchIndex)) {
                count.textContent = 'Class list unavailable';
                return;
            }
            types = window.typeSearchIndex.filter(type => type.p).slice().sort((a, b) => a.l.localeCompare(b.l));
            [...new Set(types.map(type => type.p))].sort().forEach(name => {
                packages.appendChild(element('option', { value: name }, name));
            });
            const savedPackage = read('sessionStorage', 'package');
            if (types.some(type => type.p === savedPackage)) packages.value = savedPackage;
            render();
            list.scrollTop = Number(read('sessionStorage', 'scroll')) || 0;
        }
        if (Array.isArray(window.typeSearchIndex)) {
            showTypes();
        } else {
            const url = new URL('type-search-index.js', root).href;
            let index = Array.from(document.scripts).find(script => script.src === url);
            if (!index) {
                index = element('script', { src: url });
                document.head.appendChild(index);
            }
            index.addEventListener('load', showTypes, { once: true });
            index.addEventListener('error', () => { count.textContent = 'Class list unavailable'; }, { once: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}());
