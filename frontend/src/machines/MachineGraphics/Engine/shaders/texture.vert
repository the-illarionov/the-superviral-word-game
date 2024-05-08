precision lowp float;

attribute vec4 a_position;

uniform mat4 u_matrix;
uniform mat4 u_textureMatrix;

varying vec2 v_texcoord;

void main() {
    gl_Position = u_matrix * a_position;

    v_texcoord = (u_textureMatrix * vec4(a_position.xy, 0, 1)).xy;
}