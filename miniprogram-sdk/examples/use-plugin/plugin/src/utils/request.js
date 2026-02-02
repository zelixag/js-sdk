const TAG = '[REQUEST]';
export default async function request(url, options = {}) {
    const { method = 'GET', data, headers = {} } = options;
    const config = {
        method,
        // headers,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };
    if (method === 'GET' && data) {
        const params = new URLSearchParams(data).toString();
        url += `${url.includes('?') ? '&' : '?'}${params}`;
    }
    if (method !== 'GET' && data) {
        config.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const error = {
                status: response.status,
                statusText: response.statusText,
                message: `HTTP error! status: ${response.status}`,
            };
            throw error;
        }
        return response;
    }
    catch (error) {
        if (error instanceof Error) {
            throw {
                message: error.message,
                status: 500,
                statusText: 'Client Error',
            };
        }
        throw error;
    }
}
/**
 * 资源下载请求
 * @returns {Promise<[isError: boolean, data: ArrayBuffer | string]>}
 * */
export function XMLRequest(options) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', options.url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const arrayBuffer = xhr.response;
                resolve([false, arrayBuffer]);
            }
            else if (xhr.status !== 200) {
                reject([true, xhr.statusText]);
            }
        };
        xhr.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                options.onProgress(percent);
            }
        };
        xhr.send();
    });
}
