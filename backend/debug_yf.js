const pkg = require('yahoo-finance2');
console.log('Type of pkg:', typeof pkg);
console.log('Keys of pkg:', Object.keys(pkg));
if (pkg.default) {
    console.log('Type of pkg.default:', typeof pkg.default);
    console.log('Keys of pkg.default:', Object.keys(pkg.default));
    try {
        const instance = new pkg.default();
        console.log('Instance created from pkg.default');
        console.log('Instance has search?', typeof instance.search);
        console.log('Instance has quote?', typeof instance.quote);
    } catch (e) {
        console.log('Error instantiating pkg.default:', e.message);
    }
} else {
    console.log('No default export');
}
