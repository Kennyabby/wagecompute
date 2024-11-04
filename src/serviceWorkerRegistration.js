export function register(config) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then((registration) => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // Notify user of the update
                                if (window.confirm("New update available! Would you like to load it?")) {
                                    // Trigger HMR without full refresh
                                    config.onUpdate();
                                }
                            }
                        }
                    };
                }
            };
        });
    }
}
