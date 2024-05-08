// source: https://webglfundamentals.org/webgl/resources/webgl-utils.js

function loadShader(
  gl: WebGLRenderingContext,
  shaderSource: string,
  shaderType: number,
) {
  // Create the shader object
  const shader = gl.createShader(shaderType)!

  // Load the shader source
  gl.shaderSource(shader, shaderSource)

  // Compile the shader
  gl.compileShader(shader)

  // Check the compile status
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!compiled) {
    // Something went wrong during compilation; get the error
    const lastError = gl.getShaderInfoLog(shader)
    console.error(`*** Error compiling shader '${shader}':${lastError}\n${shaderSource.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')}`)
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string,
) {
  const program = gl.createProgram()!

  gl.attachShader(program, loadShader(gl, vertexShaderSource, gl.VERTEX_SHADER)!)
  gl.attachShader(program, loadShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER)!)

  gl.linkProgram(program)

  // Check the link status
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!linked) {
    // something went wrong with the link
    const lastError = gl.getProgramInfoLog(program)
    console.error(`Error in program linking:${lastError}`)

    gl.deleteProgram(program)
    return null
  }
  return program
}

const m4 = {
  orthographic(left: number, right: number, bottom: number, top: number) {
    const near = -1
    const far = 1
    const dst = new Float32Array(16)

    dst[0] = 2 / (right - left)
    dst[1] = 0
    dst[2] = 0
    dst[3] = 0
    dst[4] = 0
    dst[5] = 2 / (top - bottom)
    dst[6] = 0
    dst[7] = 0
    dst[8] = 0
    dst[9] = 0
    dst[10] = 2 / (near - far)
    dst[11] = 0
    dst[12] = (left + right) / (left - right)
    dst[13] = (bottom + top) / (bottom - top)
    dst[14] = (near + far) / (near - far)
    dst[15] = 1

    return dst
  },

  translate(m: Float32Array, tx: number, ty: number) {
    // This is the optimized version of
    // return multiply(m, translation(tx, ty, tz), dst);
    const dst = new Float32Array(16)
    const tz = 0

    const m00 = m[0]
    const m01 = m[1]
    const m02 = m[2]
    const m03 = m[3]
    const m10 = m[1 * 4 + 0]
    const m11 = m[1 * 4 + 1]
    const m12 = m[1 * 4 + 2]
    const m13 = m[1 * 4 + 3]
    const m20 = m[2 * 4 + 0]
    const m21 = m[2 * 4 + 1]
    const m22 = m[2 * 4 + 2]
    const m23 = m[2 * 4 + 3]
    const m30 = m[3 * 4 + 0]
    const m31 = m[3 * 4 + 1]
    const m32 = m[3 * 4 + 2]
    const m33 = m[3 * 4 + 3]

    if (m !== dst) {
      dst[0] = m00
      dst[1] = m01
      dst[2] = m02
      dst[3] = m03
      dst[4] = m10
      dst[5] = m11
      dst[6] = m12
      dst[7] = m13
      dst[8] = m20
      dst[9] = m21
      dst[10] = m22
      dst[11] = m23
    }

    dst[12] = m00 * tx + m10 * ty + m20 * tz + m30
    dst[13] = m01 * tx + m11 * ty + m21 * tz + m31
    dst[14] = m02 * tx + m12 * ty + m22 * tz + m32
    dst[15] = m03 * tx + m13 * ty + m23 * tz + m33

    return dst
  },

  translation(tx: number, ty: number, tz = 0) {
    const dst = new Float32Array(16)

    dst[0] = 1
    dst[1] = 0
    dst[2] = 0
    dst[3] = 0
    dst[4] = 0
    dst[5] = 1
    dst[6] = 0
    dst[7] = 0
    dst[8] = 0
    dst[9] = 0
    dst[10] = 1
    dst[11] = 0
    dst[12] = tx
    dst[13] = ty
    dst[14] = tz
    dst[15] = 1

    return dst
  },

  scale(m: Float32Array, sx: number, sy: number) {
    // This is the optimized version of
    // return multiply(m, scaling(sx, sy, sz), dst);
    const dst = new Float32Array(16)

    dst[0] = sx * m[0 * 4 + 0]
    dst[1] = sx * m[0 * 4 + 1]
    dst[2] = sx * m[0 * 4 + 2]
    dst[3] = sx * m[0 * 4 + 3]
    dst[4] = sy * m[1 * 4 + 0]
    dst[5] = sy * m[1 * 4 + 1]
    dst[6] = sy * m[1 * 4 + 2]
    dst[7] = sy * m[1 * 4 + 3]
    dst[8] = m[2 * 4 + 0]
    dst[9] = m[2 * 4 + 1]
    dst[10] = m[2 * 4 + 2]
    dst[11] = m[2 * 4 + 3]

    if (m !== dst) {
      dst[12] = m[12]
      dst[13] = m[13]
      dst[14] = m[14]
      dst[15] = m[15]
    }

    return dst
  },
}

export {
  m4,
  createProgram,
}
