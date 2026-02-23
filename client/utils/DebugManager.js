export const DEBUG_MODE = false;

const getRuntimeDevBuildFlag = () => {
    if (typeof window === 'undefined' || !window.location) return false;
    try {
        const params = new URLSearchParams(window.location.search || '');
        if (params.get('devbuild') === '1') return true;
        if (params.get('devbuild') === '0') return false;
    } catch (e) {}
    const host = String(window.location.hostname || '').toLowerCase();
    const protocol = String(window.location.protocol || '').toLowerCase();
    if (protocol === 'file:') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.endsWith('.local')) return true;
    return false;
};

export const DEV_BUILD = getRuntimeDevBuildFlag();
export const DEV_DEBUG_MODE = DEV_BUILD && DEBUG_MODE;
