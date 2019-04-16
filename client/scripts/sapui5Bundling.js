
function bundle(baseDir) {
    const FileSystemAdapter = require("@ui5/fs/lib/adapters/FileSystem");
    const preloadBundler = require("@ui5/builder/lib/processors/bundlers/moduleBundler");

    const source = new FileSystemAdapter({
        fsBasePath: "./srf",
        virBasePath: "/resources/srf/"
    });
    const target = new FileSystemAdapter({
        fsBasePath: baseDir,
        virBasePath: "/"
    });

    source.byGlob("/**/*.{js,json,xml,html,properties}").then(function (allResources) {
        return preloadBundler({
            options: {
                bundleDefinition: {
                    name: "bundleUI5Resources.js",
                    sections: [
                        {
                            mode: "preload",
                            filters: [
                                // Includes / excludes need to be defined properly in here
                                // to only include UI5 modules, not pure AMD modules
                                "srf/control/",
                                "srf/view/",
                                "/srf/controller/**",
                                "/srf/formatter/**",
                                "/srf/model/**",
                                "/srf/Component.js",
                                "/srf/utils/**",
								"/srf/img/**"
                            ],
                            resolve: false
                        }
                    ]
                }
            },
            resources: allResources
        }).then(function (bundle) {
            return target.write(bundle[0]);
        });
    });
}

module.exports = {bundle: bundle};
