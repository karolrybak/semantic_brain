import React from 'react';
import * as THREE from 'three';
import { type Entity } from '../ecs';
import { EditorEngine } from '../core/EditorEngine';

interface ObjectPropertiesProps {
    selectedEntity: Entity;
    setSelectedEntity: (ent: Entity | null) => void;
    onDelete: (ent: Entity) => void;
    handleUpdatePhysics: (ent: Entity) => void;
    engine: EditorEngine | null;
}

const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

export const ObjectProperties: React.FC<ObjectPropertiesProps> = ({ selectedEntity, setSelectedEntity, onDelete, handleUpdatePhysics, engine }) => {
    const updateName = (val: string) => {
        selectedEntity.name = val;
        setSelectedEntity({ ...selectedEntity });
    };

    return (
        <div style={{ flex: 1, padding: '16px', fontSize: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <textarea 
                    value={selectedEntity.name} 
                    onChange={(e) => updateName(e.target.value)}
                    rows={2}
                    style={{ 
                        flex: 1, 
                        background: 'none', 
                        border: 'none', 
                        color: '#fff', 
                        fontSize: 18, 
                        fontWeight: 'bold', 
                        resize: 'none', 
                        padding: 0, 
                        fontFamily: 'inherit', 
                        outline: 'none', 
                        lineHeight: '1.2'
                    }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button 
                        onClick={() => handleUpdatePhysics(selectedEntity)} 
                        title="Sync Physics"
                        style={{ background: '#222', border: 'none', color: '#888', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'flex' }}
                    >
                        <RefreshIcon />
                    </button>
                    <button 
                        onClick={() => onDelete(selectedEntity)} 
                        title="Delete"
                        style={{ background: '#222', border: 'none', color: '#888', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'flex' }}
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>

            {/* Info Box Style */}
            <div style={{ background: '#111', padding: '12px', borderRadius: 6, color: '#888', fontSize: 11, lineHeight: '1.4', border: '1px solid #222' }}>
                Entity ID: {selectedEntity.id} <br/>
                Type: {selectedEntity.tags.join(', ').toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: '1px', fontWeight: 'bold' }}>TRANSFORM</div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Position</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input type="number" value={selectedEntity.position.x} onChange={e => { selectedEntity.position.x = Number(e.target.value); handleUpdatePhysics(selectedEntity); if (selectedEntity.renderable) selectedEntity.renderable.mesh.position.x = selectedEntity.position.x; setSelectedEntity({...selectedEntity}); }} step="0.1" style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #222', borderRadius: 4, padding: '4px' }}/>
                        <input type="number" value={selectedEntity.position.y} onChange={e => { selectedEntity.position.y = Number(e.target.value); handleUpdatePhysics(selectedEntity); if (selectedEntity.renderable) selectedEntity.renderable.mesh.position.y = selectedEntity.position.y; setSelectedEntity({...selectedEntity}); }} step="0.1" style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #222', borderRadius: 4, padding: '4px' }}/>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Rotation</span>
                    <input type="number" value={Math.round(THREE.MathUtils.radToDeg(selectedEntity.rotation))} onChange={e => { selectedEntity.rotation = THREE.MathUtils.degToRad(Number(e.target.value)); if (selectedEntity.renderable) selectedEntity.renderable.mesh.rotation.z = selectedEntity.rotation; setSelectedEntity({...selectedEntity}); }} step="1" style={{ width: 124, background: '#111', color: '#fff', border: '1px solid #222', borderRadius: 4, padding: '4px' }}/>
                </div>

                {selectedEntity.sdfCollider && (
                    <>
                        <div style={{ fontSize: 10, color: '#444', letterSpacing: '1px', fontWeight: 'bold', marginTop: 10 }}>COLLIDER</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>Width / R1</span>
                                <input type="number" min="0.1" max="100" step="0.1" value={selectedEntity.sdfCollider.size.x} onChange={e => { selectedEntity.sdfCollider!.size.x = Number(e.target.value); setSelectedEntity({...selectedEntity}); }} style={{ width: 80, background: '#111', border: '1px solid #222', color: '#fff', padding: '4px', borderRadius: 4 }}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>Height / R2</span>
                                <input type="number" min="0.1" max="100" step="0.1" value={selectedEntity.sdfCollider.size.y} onChange={e => { selectedEntity.sdfCollider!.size.y = Number(e.target.value); setSelectedEntity({...selectedEntity}); }} style={{ width: 80, background: '#111', border: '1px solid #222', color: '#fff', padding: '4px', borderRadius: 4 }}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888' }}>Extra Param</span>
                                <input type="number" min="0" max="100" step="0.1" value={selectedEntity.scale.x} onChange={e => { selectedEntity.scale.x = Number(e.target.value); setSelectedEntity({...selectedEntity}); }} style={{ width: 80, background: '#111', border: '1px solid #222', color: '#fff', padding: '4px', borderRadius: 4 }}/>
                            </div>
                        </div>
                    </>
                )}

                <div style={{ fontSize: 10, color: '#444', letterSpacing: '1px', fontWeight: 'bold', marginTop: 10 }}>PHYSICS</div>
                {selectedEntity.physics && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Mass</span>
                        <input type="number" min="0.1" max="1000" step="0.1" value={selectedEntity.physics.mass} onChange={e => { 
                            const m = Math.max(0.1, Number(e.target.value));
                            selectedEntity.physics!.mass = m;
                            selectedEntity.physics!.invMass = 1.0 / m;
                            if (selectedEntity.physics!.particleIdx !== undefined) {
                                engine?.physics.setParticleInvMass(selectedEntity.physics.particleIdx, 1.0 / m);
                                engine?.physics.syncGPU();
                            }
                            setSelectedEntity({...selectedEntity}); 
                        }} style={{ width: 80, background: '#111', border: '1px solid #222', color: '#fff', padding: '4px', borderRadius: 4 }}/>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Friction</span>
                    <input type="number" min="0" max="2" step="0.05" value={selectedEntity.friction ?? 0.5} onChange={e => { 
                        selectedEntity.friction = Number(e.target.value); 
                        if (selectedEntity.physics?.particleIdx !== undefined) {
                            engine?.physics.setParticleFriction(selectedEntity.physics.particleIdx, selectedEntity.friction);
                            engine?.physics.syncGPU();
                        }
                        setSelectedEntity({...selectedEntity}); 
                    }} style={{ width: 80, background: '#111', border: '1px solid #222', color: '#fff', padding: '4px', borderRadius: 4 }}/>
                </div>
            </div>
        </div>
    );
};