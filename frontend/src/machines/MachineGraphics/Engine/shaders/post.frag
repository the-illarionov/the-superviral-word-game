// Shader was inspired by: https://godotshaders.com/shader/god-rays/

precision lowp float;

uniform float u_time;
varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

const float angle = -0.3;
const float position = -0.17;
const float spread = 1.0;
const float cutoff = 0.17;
const float falloff = 0.35;
const float edge_fade = 0.15;

const float speed = 3.0;
const float ray1_density = 8.0;
const float ray2_density = 30.0;
const float ray2_intensity = 0.3;

const vec4 color = vec4(0.83, 0.69, 0.34, 0.8);

const float seed = 5.0;

float random(vec2 _uv) {
    return fract(sin(dot(_uv.xy, vec2(12.9898, 78.233))) *
        43758.5453123);
}

float noise(in vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
        (c - a) * u.y * (1.0 - u.x) +
        (d - b) * u.x * u.y;
}

mat2 rotate(float _angle) {
    return mat2(vec2(cos(_angle), -sin(_angle)), vec2(sin(_angle), cos(_angle)));
}

vec4 screen(vec4 base, vec4 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

void main() {
    vec2 UV = gl_FragCoord.xy / u_resolution.xy;
    vec4 texture = texture2D(u_texture, v_texcoord);

    vec2 transformed_uv = (rotate(angle) * (UV - position)) / ((UV.y + spread) - (UV.y * spread));

    vec2 ray1 = vec2(transformed_uv.x * ray1_density + sin(u_time * 0.1 * speed) * (ray1_density * 0.2) + seed, 1.0);
    vec2 ray2 = vec2(transformed_uv.x * ray2_density + sin(u_time * 0.2 * speed) * (ray1_density * 0.2) + seed, 1.0);

    float cut = step(cutoff, transformed_uv.x) * step(cutoff, 1.0 - transformed_uv.x);
    ray1 *= cut;
    ray2 *= cut;

    float rays = clamp(noise(ray1) + (noise(ray2) * ray2_intensity), 0., 1.);

    rays *= smoothstep(0.0, falloff, (UV.y)); // Bottom
    rays *= smoothstep(0.0 + cutoff, edge_fade + cutoff, transformed_uv.x); // Left
    rays *= smoothstep(0.0 + cutoff, edge_fade + cutoff, 1.0 - transformed_uv.x); // Right

    vec4 shine = vec4(vec3(rays) * color.rgb, 1.0);

    shine = screen(texture2D(u_texture, v_texcoord), vec4(color)).rgba;

    gl_FragColor = mix(texture * 0.7, shine, rays);
}