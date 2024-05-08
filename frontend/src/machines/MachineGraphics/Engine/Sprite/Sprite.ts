import type { Engine } from '..'
import { m4 } from '../utils'

interface Constructor {
  image: HTMLImageElement
  x: number
  y: number
  width: number
  engine: Engine

  sx?: number
  sy?: number
  sWidth?: number
  sHeight?: number

  isTranslating?: true
}

export class Sprite {
  engine: Engine
  image: HTMLImageElement
  texture: WebGLTexture
  x: number
  y: number
  width: number
  sx: number
  sy: number
  sWidth: number
  sHeight: number

  realX = 0
  realY = 0
  realWidth = 0
  realHeight = 0

  // @ts-expect-error undefined
  matrix: Float32Array
  // @ts-expect-error undefined
  texMatrix: Float32Array
  isTranslating: undefined | true

  customUpdate?(delta: number): void

  constructor({ engine, image, x, y, width, sx, sy, sWidth, sHeight, isTranslating }: Constructor) {
    this.engine = engine

    this.image = image
    this.x = x
    this.y = y
    this.width = width

    this.texture = this.initGLTexture()

    this.sx = sx ?? 0
    this.sy = sy ?? 0
    this.sWidth = sWidth ?? this.image.width
    this.sHeight = sHeight ?? this.image.height

    this.isTranslating = isTranslating

    this.updateRealSizes()
    this.updateRealPositions()
    this.updateTranslationMatrix()
    this.updateTexMatrix()
  }

  initGLTexture() {
    const gl = this.engine.gl
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image)

    return tex!
  }

  updateRealSizes() {
    this.realWidth = ~~(this.engine.width_scaled * this.width)
    this.realHeight = ~~(this.image.height * (this.realWidth / (this.sWidth ?? this.image.width)))
  }

  updateRealPositions() {
    this.realX = ~~(this.engine.width * this.x - (this.engine.width_diff_half - this.x * this.engine.width_diff))
    this.realY = ~~(this.engine.height * this.y)
  }

  updateTranslationMatrix() {
    const matrix = m4.translate(this.engine.matrix, this.realX, this.realY)
    this.matrix = m4.scale(matrix, this.realWidth, this.realHeight)
  }

  updateTexMatrix() {
    const texMatrix = m4.translation(this.sx / this.image.width, this.sy / this.image.height)
    this.texMatrix = m4.scale(texMatrix, this.sWidth / this.image.width, this.sHeight / this.image.height)
  }

  update(delta: number) {
    if (this.customUpdate)
      this.customUpdate(delta)
  }

  render() {
    const engine = this.engine
    const gl = engine.gl

    gl.bindTexture(gl.TEXTURE_2D, this.texture)

    if (this.isTranslating || engine.wasResized)
      this.updateTranslationMatrix()
    gl.uniformMatrix4fv(engine.flows.texture.uniforms.matrix, false, this.matrix)

    gl.uniformMatrix4fv(engine.flows.texture.uniforms.textureMatrix, false, this.texMatrix)

    gl.uniform1i(engine.flows.texture.uniforms.texture, 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
}
