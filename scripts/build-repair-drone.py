"""Build the repair-drone mesh from NASA source parts and original detail.

Run with Blender in background mode. DRONE_SOURCE points at a directory containing
cluster-ii.glb, insight-stowed.glb, grease-gun.glb and the Curiosity Parts folder.
The resulting baked model has one material and is written to models/.
"""
import json
import math
import os
import struct
from pathlib import Path

import bpy
from mathutils import Vector

source = Path(os.environ["DRONE_SOURCE"])
destination = Path(os.environ["DRONE_OUTPUT"])
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, rgb, metallic=0.2, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


white = material("ceramic", (0.72, 0.79, 0.83), 0.25, 0.45)
dark = material("graphite", (0.035, 0.055, 0.072), 0.55, 0.4)
metal = material("titanium", (0.34, 0.42, 0.45), 0.75, 0.32)
red = material("service red", (0.58, 0.035, 0.05), 0.32, 0.43)
blue = material("cyan lens", (0.015, 0.70, 0.85), 0.25, 0.26)
glass = material("optics", (0.015, 0.055, 0.08), 0.6, 0.15)
gold = material("connector gold", (0.54, 0.32, 0.08), 0.75, 0.35)


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def sphere(name, location, scale, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, mat)


def cylinder(name, a, b, radius, mat, vertices=24):
    a, b = Vector(a), Vector(b)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a+b)*0.5)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat)


def box(name, location, scale, mat, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("machined edges", "BEVEL")
    mod.width = bevel
    mod.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat)


def ring(name, location, major, minor, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8, location=location, rotation=rotation, major_radius=major, minor_radius=minor)
    return finish(bpy.context.object, name, mat)


def import_cluster():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source / "cluster-ii.glb"))
    added = [o for o in bpy.data.objects if o not in before]
    # The central solar panel is the intended body. Its 88 m antenna sheet is
    # excluded; the foil bodies also contain booms and are not used as hulls.
    keepers = [o for o in added if o.type == "MESH" and (o.name.startswith("shiny_panel") or o.name.startswith("foil_gold"))]
    for obj in keepers:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
    for obj in added:
        if obj not in keepers:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in keepers:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
        is_foil = obj.name.startswith("foil_gold")
        size = max(obj.dimensions)
        obj.scale = ((0.32 if is_foil else 0.43) / size,) * 3
        obj.location = (0, 0, -0.045 if is_foil else 0.22)
        obj.name = "Cluster II thermal foil" if is_foil else "Cluster II core"


def imported_arm(filename, centre, length, direction, name):
    before = set(bpy.data.objects)
    bpy.ops.wm.stl_import(filepath=str(source / "Parts" / filename))
    obj = next(o for o in bpy.data.objects if o not in before and o.type == "MESH")
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    # NASA's printable upper and lower arms run along local X.
    obj.scale = (length / obj.dimensions.x,) * 3
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector(direction).to_track_quat("X", "Z")
    obj.location = centre
    return finish(obj, name, white)


def import_nasa_part(filename, object_name, location, width):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source / filename))
    added = [obj for obj in bpy.data.objects if obj not in before]
    keep = next(obj for obj in added if obj.type == "MESH" and obj.name.startswith(object_name))
    world = keep.matrix_world.copy()
    keep.parent = None
    keep.matrix_world = world
    for obj in added:
        if obj != keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = keep
    keep.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    keep.scale = (width / max(keep.dimensions),) * 3
    keep.location = location
    keep.name = "NASA " + object_name
    return keep


def surface_panel(index, inner, outer, mat):
    start = math.tau * (index / 16 + 0.009)
    end = math.tau * ((index + 1) / 16 - 0.009)
    vertices = []
    for radius, angle in ((inner, start), (outer, start), (outer, end), (inner, end)):
        x = 0.49 * radius * math.cos(angle)
        y = 0.38 * radius * math.sin(angle)
        z = 0.10 + 0.13 * math.sqrt(max(0, 1 - radius * radius)) + 0.004
        vertices.append((x, y, z))
    mesh = bpy.data.meshes.new("service panel mesh")
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new("raised service panel", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    solid = obj.modifiers.new("panel thickness", "SOLIDIFY")
    solid.thickness = 0.006
    bevel = obj.modifiers.new("panel edge", "BEVEL")
    bevel.width = 0.002
    bevel.segments = 2
    return obj


def arm(side, tool):
    x = side * 0.26
    joints = [(x, 0.08, -0.20), (x * 1.32, -0.03, -0.36), (x * 1.4, -0.22, -0.45), (x * 1.3, -0.36, -0.42)]
    import_nasa_part("insight-stowed.glb", "arm_01", joints[0], 0.09)
    for i, pt in enumerate(joints):
        cylinder("arm motor cap", (pt[0] - 0.035, pt[1], pt[2]), (pt[0] + 0.035, pt[1], pt[2]), 0.045 if i < 2 else 0.031, dark)
        cylinder("arm bearing", (pt[0] - 0.044, pt[1], pt[2]), (pt[0] - 0.035, pt[1], pt[2]), 0.029, metal)
        cylinder("motor centre", (pt[0] - 0.047, pt[1], pt[2]), (pt[0] - 0.044, pt[1], pt[2]), 0.018, dark)
        ring("motor collar", pt, 0.031 if i < 2 else 0.023, 0.003, blue, (0, math.pi / 2, 0))
    for i in range(3):
        a, b = Vector(joints[i]), Vector(joints[i+1])
        imported_arm("upper-arm.stl" if i != 1 else "lower-arm.stl", (a+b)*0.5, (b-a).length * 0.85, b-a, "Curiosity arm segment")
        housing = box("armoured arm housing", (a+b)*0.5, (0.06, 0.045, (b-a).length * 0.68), white, 0.009)
        housing.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
        inset = box("arm service inset", (a+b)*0.5 + Vector((side*0.032, 0, 0)), (0.007, 0.024, (b-a).length * 0.39), dark, 0.002)
        inset.rotation_euler = housing.rotation_euler
        offset = Vector((side * 0.025, 0, -0.025))
        cylinder("arm cable", a+offset, b+offset, 0.005, dark, 10)
        cylinder("arm conduit", a-offset, b-offset, 0.003, metal, 10)
        for fraction in (0.25, 0.75):
            point = a.lerp(b, fraction)
            sphere("cable clamp", point+offset, (0.009, 0.009, 0.009), gold, 10, 6)
    for pt in joints:
        for dy in (-0.013, 0.013):
            sphere("motor bolt", (pt[0]-0.04, pt[1]+dy, pt[2]), (0.004, 0.004, 0.004), metal, 10, 6)
    end = joints[-1]
    if tool:
        import_nasa_part("grease-gun.glb", "Ggun", (x*1.3, -0.455, -0.42), 0.09)
        cylinder("welding tool", end, (x*1.3, -0.49, -0.42), 0.028, metal)
        cylinder("welding nozzle", (x*1.3, -0.49, -0.42), (x*1.3, -0.54, -0.42), 0.012, gold)
        sphere("tool light", (x*1.3, -0.545, -0.42), (0.009, 0.009, 0.009), blue, 12, 8)
    else:
        box("gripper palm", (x*1.3, -0.40, -0.42), (0.075, 0.035, 0.05), dark, 0.008)
        for dx in (-0.028, 0.028):
            cylinder("gripper finger", (x*1.3+dx, -0.42, -0.42), (x*1.3+dx*1.4, -0.48, -0.42), 0.009, metal, 12)
            cylinder("gripper tip", (x*1.3+dx*1.4, -0.48, -0.42), (x*1.3+dx*0.8, -0.505, -0.42), 0.008, dark, 12)


import_cluster()
sphere("armoured upper shell", (0, 0, 0.10), (0.49, 0.38, 0.13), white, 64, 24)
sphere("lower pressure hull", (0, 0, 0.035), (0.46, 0.35, 0.10), dark, 64, 20)
for i in range(16):
    surface_panel(i, 0.46, 0.70, white if i % 4 else metal)
    surface_panel(i, 0.71, 0.96, white if i % 4 else dark)
ring("safety stripe", (0, 0, 0.07), 0.405, 0.012, red)
ring("lower luminous collar", (0, 0, -0.05), 0.27, 0.016, blue)
box("rear electronics housing", (0, 0.15, 0.25), (0.29, 0.23, 0.13), dark, 0.025)
box("rear service lid", (0, 0.15, 0.32), (0.23, 0.17, 0.018), metal, 0.006)
for side in (-1, 1):
    box("top equipment cover", (side * 0.17, 0.04, 0.225), (0.09, 0.13, 0.025), white, 0.008)
    for j in range(5):
        box("thermal vent", (side * 0.17, 0.01 + j * 0.018, 0.241), (0.06, 0.006, 0.003), dark, 0.001)
    cylinder("handrail", (side * 0.30, 0.08, 0.235), (side * 0.30, 0.23, 0.235), 0.004, gold, 10)
    for y in (0.08, 0.23):
        cylinder("handrail foot", (side * 0.30, y, 0.19), (side * 0.30, y, 0.235), 0.004, gold, 10)
    for y in (-0.17, 0.19):
        sphere("navigation lamp", (side * 0.39, y, 0.17), (0.014, 0.014, 0.009), blue, 16, 8)
for y in (-0.21, -0.06, 0.10, 0.25):
    cylinder("panel seam", (-0.32, y, 0.17), (0.32, y, 0.17), 0.002, metal, 6)
for i in range(24):
    angle = math.tau * i / 24
    sphere("rim fastener", (0.455*math.cos(angle), 0.345*math.sin(angle), 0.11), (0.006, 0.006, 0.004), metal, 10, 6)
# The nose is toward -Y.
cylinder("lens outer housing", (0, -0.31, 0.09), (0, -0.46, 0.09), 0.105, metal, 48)
cylinder("lens dark glass", (0, -0.46, 0.09), (0, -0.472, 0.09), 0.085, glass, 48)
ring("lens ring", (0, -0.475, 0.09), 0.079, 0.007, dark, (math.pi/2, 0, 0))
sphere("lens glint", (-0.026, -0.48, 0.115), (0.015, 0.004, 0.015), blue, 16, 8)
for side in (-1, 1):
    x=side*0.31
    cylinder("thruster housing", (x, -0.19, 0.09), (x, -0.37, 0.09), 0.067, white, 32)
    cylinder("thruster red cap", (x, -0.37, 0.09), (x, -0.388, 0.09), 0.061, red, 32)
    cylinder("thruster aperture", (x, -0.388, 0.09), (x, -0.397, 0.09), 0.044, dark, 32)
    cylinder("antenna mount", (side*0.22, 0.06, 0.20), (side*0.22, 0.06, 0.25), 0.019, metal)
    cylinder("antenna", (side*0.22, 0.06, 0.24), (side*0.26, 0.09, 0.59), 0.006, dark, 10)
    sphere("antenna light", (side*0.26, 0.09, 0.59), (0.015, 0.015, 0.015), blue, 12, 8)
    arm(side, side == 1)

# Each material is baked to one UV texture so the drone is one instanced draw.
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = next(o for o in bpy.context.selected_objects if o.type == "MESH")
bpy.ops.object.convert(target="MESH")
bpy.ops.object.join()
drone = bpy.context.object
drone.name = "SPX repair drone"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=0.008)
bpy.ops.object.mode_set(mode="OBJECT")
image = bpy.data.images.new("drone atlas", width=1024, height=1024)
for mat in drone.data.materials:
    if mat and mat.use_nodes:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        mat.node_tree.nodes.active = node
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.device = "CPU"
bpy.context.scene.cycles.samples = 1
bpy.context.scene.render.bake.use_pass_direct = False
bpy.context.scene.render.bake.use_pass_indirect = False
bpy.context.scene.render.bake.use_pass_color = True
bpy.ops.object.bake(type="DIFFUSE", margin=3)
image.pack()
emission = bpy.data.images.new("drone lights", width=1024, height=1024)
for mat in drone.data.materials:
    if mat and mat.use_nodes:
        nodes = mat.node_tree.nodes
        emit = nodes.new("ShaderNodeEmission")
        emit.inputs["Color"].default_value = (0.015, 0.70, 0.85, 1) if mat.name == "cyan lens" else (0, 0, 0, 1)
        mat.node_tree.links.new(emit.outputs[0], nodes.get("Material Output").inputs["Surface"])
        target = nodes.new("ShaderNodeTexImage")
        target.image = emission
        nodes.active = target
bpy.ops.object.bake(type="EMIT", margin=3)
emission.pack()
atlas = bpy.data.materials.new("atlas")
atlas.use_nodes = True
texture = atlas.node_tree.nodes.new("ShaderNodeTexImage")
texture.image = image
shader = atlas.node_tree.nodes.get("Principled BSDF")
atlas.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
light_map = atlas.node_tree.nodes.new("ShaderNodeTexImage")
light_map.image = emission
atlas.node_tree.links.new(light_map.outputs["Color"], shader.inputs["Emission Color"])
shader.inputs["Emission Strength"].default_value = 1.0
drone.data.materials.clear()
drone.data.materials.append(atlas)
for poly in drone.data.polygons:
    poly.material_index = 0
def write_provenance(path):
    data = Path(path).read_bytes()
    length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20+length])
    gltf["asset"]["extras"] = {
        "title": "SPX repair drone",
        "author": "NASA",
        "license": "Public domain, NASA (https://www.nasa.gov/nasa-brand-center/images-and-media/)",
        "source": "https://science.nasa.gov/3d-resources/cluster-ii/",
        "changes": "Cluster II deck and foil, InSight joint, Curiosity arm and grease gun resized and assembled with original geometry; no marks; one baked atlas.",
    }
    encoded = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((-len(encoded)) % 4)
    rest = data[20+length:]
    result = b"glTF" + struct.pack("<II", 2, 20 + len(encoded) + len(rest)) + struct.pack("<II", len(encoded), 0x4e4f534a) + encoded + rest
    Path(path).write_bytes(result)


bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", export_apply=True)
write_provenance(destination)
print("DRONE_TRIANGLES", sum(len(p.vertices)-2 for p in drone.data.polygons))
coarse = os.environ.get("DRONE_COARSE_OUTPUT")
if coarse:
    modifier = drone.modifiers.new("far detail", "DECIMATE")
    modifier.ratio = 0.055
    bpy.context.view_layer.objects.active = drone
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.export_scene.gltf(filepath=coarse, export_format="GLB", export_apply=True)
    write_provenance(coarse)
    print("DRONE_COARSE_TRIANGLES", sum(len(p.vertices)-2 for p in drone.data.polygons))
