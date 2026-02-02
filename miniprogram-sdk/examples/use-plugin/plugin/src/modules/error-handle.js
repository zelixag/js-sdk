export default function Errors(params) {
    return {
        code: params.code,
        message: params.message,
        timestamp: Date.now(),
        originalError: params.e ? JSON.stringify(params.e) : null,
    };
}
