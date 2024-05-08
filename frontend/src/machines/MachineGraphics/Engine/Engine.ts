import { machineGraphics } from '../MachineGraphics'
import { createProgram, m4 } from './utils'
import textureVertShaderSource from './shaders/texture.vert?raw'
import textureFragShaderSource from './shaders/texture.frag?raw'

import postVertShaderSource from './shaders/post.vert?raw'
import postFragShaderSource from './shaders/post.frag?raw'
import { Cloud, ObjectManager } from '.'
import { ASPECT_RATIO } from '@/composables/useConstants'

export class Engine {
  canvas: HTMLCanvasElement

  objects: ObjectManager

  width = 0
  height = 0
  width_scaled = 0
  width_diff = 0
  width_diff_half = 0

  lastTime = 0
  currentTime = 0

  resizeTimeoutId = 0
  wasResized = false

  // WebGL stuff
  gl: WebGLRenderingContext
  // @ts-expect-error undefined
  flows: {
    texture: {
      program: WebGLProgram
      positionBuffer: WebGLBuffer
      attributes: {
        position: number
      }
      uniforms: {
        matrix: WebGLUniformLocation
        texture: WebGLUniformLocation
        textureMatrix: WebGLUniformLocation
      }
    }
    post: {
      program: WebGLProgram
      positionBuffer: WebGLBuffer
      frameBuffer: WebGLFramebuffer
      texture: WebGLTexture
      attributes: {
        position: number
      }
      uniforms: {
        texture: WebGLUniformLocation
        time: WebGLUniformLocation
        resolution: WebGLUniformLocation
      }
    }
  } = {}

  // @ts-expect-error undefined
  matrix: Float32Array

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.objects = new ObjectManager(this)

    this.updateSizes()
    const resizeObserver = new ResizeObserver(this.resize.bind(this))
    resizeObserver.observe(this.canvas)

    // WebGL initialization
    const gl = this.canvas.getContext('webgl')!
    this.gl = gl

    { // Default texture program
      const program = createProgram(gl, textureVertShaderSource, textureFragShaderSource)!

      this.flows.texture = {
        program,
        positionBuffer: gl.createBuffer()!,
        attributes: {
          position: gl.getAttribLocation(program, 'a_position'),
        },
        uniforms: {
          matrix: gl.getUniformLocation(program, 'u_matrix')!,
          texture: gl.getUniformLocation(program, 'u_texture')!,
          textureMatrix: gl.getUniformLocation(program, 'u_textureMatrix')!,
        },
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.flows.texture.positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(this.flows.texture.attributes.position)
      gl.vertexAttribPointer(this.flows.texture.attributes.position, 2, gl.FLOAT, false, 0, 0)
    }

    { // Postprocessing program
      const program = createProgram(gl, postVertShaderSource, postFragShaderSource)!

      this.flows.post = {
        program,
        positionBuffer: gl.createBuffer()!,
        frameBuffer: gl.createFramebuffer()!,
        texture: gl.createTexture()!,
        attributes: {
          position: gl.getAttribLocation(program, 'a_position'),
        },
        uniforms: {
          texture: gl.getUniformLocation(program, 'u_texture')!,
          time: gl.getUniformLocation(program, 'u_time')!,
          resolution: gl.getUniformLocation(program, 'u_resolution')!,
        },
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.flows.post.positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(this.flows.post.attributes.position)
      gl.vertexAttribPointer(this.flows.post.attributes.position, 2, gl.FLOAT, false, 0, 0)

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.flows.post.frameBuffer)
      gl.bindTexture(gl.TEXTURE_2D, this.flows.post.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.flows.post.texture, 0)
    }

    // rendering options
    gl.viewport(0, 0, this.width, this.height)

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    this.render(0)
  }

  resize() {
    clearTimeout(this.resizeTimeoutId)

    this.resizeTimeoutId = setTimeout(() => {
      this.updateSizes()
    }, 200)
  }

  updateSizes() {
    this.width = ~~this.canvas.clientWidth
    this.height = ~~this.canvas.clientHeight

    this.width_scaled = ~~(this.height * ASPECT_RATIO)
    this.width_diff = this.width_scaled - this.width
    this.width_diff_half = ~~(this.width_diff / 2)

    this.canvas.width = this.width
    this.canvas.height = this.height

    this.matrix = m4.orthographic(0, this.width, this.height, 0)

    Cloud.updateOptionsSpeed(this.width)

    this.objects.sprites.forEach((sprite) => {
      sprite.updateRealSizes()
      sprite.updateRealPositions()
    })

    if (this.gl) {
      const gl = this.gl
      gl.bindTexture(gl.TEXTURE_2D, this.flows.post.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.viewport(0, 0, this.width, this.height)
    }

    this.wasResized = true
  }

  render(time: number) {
    const isWaiting = machineGraphics.snapshot.value.hasTag('waiting')
    const delta = (time - this.lastTime) / 1000

    const gl = this.gl

    gl.clearColor(0, 0, 0, 1)
    gl.clear(this.gl.COLOR_BUFFER_BIT)

    // Drawing to framebuffer
    gl.useProgram(this.flows.texture.program)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.flows.texture.positionBuffer)
    gl.vertexAttribPointer(this.flows.texture.attributes.position, 2, gl.FLOAT, false, 0, 0)

    if (isWaiting)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.flows.post.frameBuffer)

    this.objects.sprites.forEach((sprite) => {
      sprite.update(delta)
      sprite.render()
    })

    // Drawing to canvas
    if (isWaiting)
      gl.useProgram(this.flows.post.program)

    if (isWaiting) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.flows.post.positionBuffer)
      gl.vertexAttribPointer(this.flows.post.attributes.position, 2, gl.FLOAT, false, 0, 0)

      gl.bindTexture(gl.TEXTURE_2D, this.flows.post.texture)
      gl.uniform1i(this.flows.post.uniforms.texture, 0)

      gl.uniform1f(this.flows.post.uniforms.time, time / 1000)
      gl.uniform2f(this.flows.post.uniforms.resolution, this.width, this.height)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    this.lastTime = time

    if (!window.___e2e.isPlaywright)
      requestAnimationFrame(this.render.bind(this))

    this.wasResized = false
  }
}
