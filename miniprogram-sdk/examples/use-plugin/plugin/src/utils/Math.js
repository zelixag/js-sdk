export function length(vec) { return Math.sqrt(vec.reduce((sum, val) => (sum + val * val), 0.0)); }
export function normalize(vec) {
    let vec_len = length(vec);
    return vec.map((x) => (x / vec_len));
}
export function mvmul(lhs, rhs) {
    // lhs is row major.
    const size_row = lhs.length;
    const size_col = rhs.length;
    let result = Array(size_row);
    for (let i = 0; i < size_row; i++) {
        result[i] = 0.0;
        for (let j = 0; j < size_col; j++)
            result[i] += lhs[i][j] * rhs[j];
    }
    return result;
}
export function mmul(lhs, rhs) {
    // lhs and rhs is row major.
    const size_row = lhs.length;
    const size_mid = rhs.length;
    const size_col = rhs[0].length;
    let result = Array(size_row);
    for (let i = 0; i < size_row; i++) {
        let result_row = Array(size_col);
        for (let j = 0; j < size_col; j++) {
            result_row[j] = 0.0;
            for (let k = 0; k < size_mid; k++)
                result_row[j] += lhs[i][k] * rhs[k][j];
        }
        result[i] = result_row;
    }
    return result;
}
export function identity(size) {
    let result = Array(size);
    for (let i = 0; i < size; i++) {
        let result_row = Array(size);
        for (let j = 0; j < size; j++)
            result_row[j] = (i == j ? 1.0 : 0.0);
        result[i] = result_row;
    }
    return result;
}
export function det3(mat) {
    let result = 0.0;
    result += mat[0][0] * mat[1][1] * mat[2][2];
    result += mat[0][1] * mat[1][2] * mat[2][0];
    result += mat[0][2] * mat[1][0] * mat[2][1];
    result -= mat[0][2] * mat[1][1] * mat[2][0];
    result -= mat[0][1] * mat[1][0] * mat[2][2];
    result -= mat[0][0] * mat[1][2] * mat[2][1];
    return result;
}
export function inv3(mat) {
    const invdet = 1.0 / det3(mat);
    return [
        [(mat[1][1] * mat[2][2] - mat[2][1] * mat[1][2]) * invdet, (mat[0][2] * mat[2][1] - mat[0][1] * mat[2][2]) * invdet, (mat[0][1] * mat[1][2] - mat[0][2] * mat[1][1]) * invdet],
        [(mat[1][2] * mat[2][0] - mat[1][0] * mat[2][2]) * invdet, (mat[0][0] * mat[2][2] - mat[0][2] * mat[2][0]) * invdet, (mat[1][0] * mat[0][2] - mat[0][0] * mat[1][2]) * invdet],
        [(mat[1][0] * mat[2][1] - mat[2][0] * mat[1][1]) * invdet, (mat[2][0] * mat[0][1] - mat[0][0] * mat[2][1]) * invdet, (mat[0][0] * mat[1][1] - mat[1][0] * mat[0][1]) * invdet]
    ];
}
export function quaternion_conj(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}
export function quaternion_mul(lhs, rhs) {
    return [
        lhs[0] * rhs[0] - lhs[1] * rhs[1] - lhs[2] * rhs[2] - lhs[3] * rhs[3],
        lhs[0] * rhs[1] + lhs[1] * rhs[0] + lhs[2] * rhs[3] - lhs[3] * rhs[2],
        lhs[0] * rhs[2] - lhs[1] * rhs[3] + lhs[2] * rhs[0] + lhs[3] * rhs[1],
        lhs[0] * rhs[3] + lhs[1] * rhs[2] - lhs[2] * rhs[1] + lhs[3] * rhs[0],
    ];
}
export function quaternion_to_mat(q) {
    const [r, i, j, k] = q;
    return [
        [r * r + i * i - j * j - k * k, 2 * (i * j - k * r), 2 * (i * k + j * r)],
        [2 * (i * j + k * r), r * r - i * i + j * j - k * k, 2 * (j * k - i * r)],
        [2 * (i * k - j * r), 2 * (j * k + i * r), r * r - i * i - j * j + k * k]
    ];
}
export function mat_to_quaternion(mat) {
    let trace;
    let result;
    if (mat[2][2] < 0.0) {
        if (mat[0][0] > mat[1][1]) {
            trace = 1.0 + mat[0][0] - mat[1][1] - mat[2][2];
            result = [mat[2][1] - mat[1][2], trace, mat[1][0] + mat[0][1], mat[0][2] + mat[2][0]];
        }
        else {
            trace = 1.0 - mat[0][0] + mat[1][1] - mat[2][2];
            result = [mat[0][2] - mat[2][0], mat[1][0] + mat[0][1], trace, mat[2][1] + mat[1][2]];
        }
    }
    else {
        if (mat[0][0] < -mat[1][1]) {
            trace = 1.0 - mat[0][0] - mat[1][1] + mat[2][2];
            result = [mat[1][0] - mat[0][1], mat[0][2] + mat[2][0], mat[2][1] + mat[1][2], trace];
        }
        else {
            trace = 1.0 + mat[0][0] + mat[1][1] + mat[2][2];
            result = [trace, mat[2][1] - mat[1][2], mat[0][2] - mat[2][0], mat[1][0] - mat[0][1]];
        }
    }
    let trace_2sqrt = 2.0 * Math.sqrt(trace); // need further check
    for (let i = 0; i < 4; i++)
        result[i] /= trace_2sqrt;
    return result;
}
export function GivensTransform(mat, row0, row1, angle) {
    // The angle should be in radian.
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const size_col = mat[0].length;
    for (let i = 0; i < size_col; i++) {
        const a1 = c * mat[row0][i] - s * mat[row1][i];
        const a2 = s * mat[row0][i] + c * mat[row1][i];
        mat[row0][i] = a1;
        mat[row1][i] = a2;
    }
}
export function Euler_to_mat(angles, order = "xyz") {
    // The angle should be in radian.
    let result = identity(3);
    switch (order) {
        case "xyz":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "yzx":
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            break;
        case "zxy":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "xzy":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 2, 0, angles[1]);
            break;
        case "yxz":
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "zyx":
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 1, 2, angles[0]);
            break;
        default:
            throw Error("Unrecognizable rotation order.");
    }
    return result;
}
export function make_homogeneous(mat, translation) {
    // lhs and rhs is row major.
    return [
        [mat[0][0], mat[0][1], mat[0][2], translation[0]],
        [mat[1][0], mat[1][1], mat[1][2], translation[1]],
        [mat[2][0], mat[2][1], mat[2][2], translation[2]],
        [0.0, 0.0, 0.0, 1.0]
    ];
}
export function flatten(mat) {
    const size_row = mat.length;
    const size_col = mat[0].length;
    let result = Array(size_row * size_col);
    for (let i = 0; i < size_row; i++) {
        for (let j = 0; j < size_col; j++)
            result[i * size_col + j] = mat[i][j];
    }
    return result;
}
