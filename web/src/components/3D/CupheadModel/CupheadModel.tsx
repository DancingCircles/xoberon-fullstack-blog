import { useRef, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import './CupheadModel.css'

interface ModelProps {
  url: string
  targetRotation: number
  isPlaying: boolean
}

function Model({ url, targetRotation, isPlaying }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const { scene, animations } = useGLTF(url)

  // 初始化动画
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(scene)
      mixerRef.current.timeScale = 4 // 2倍速播放
      animations.forEach((clip) => {
        const action = mixerRef.current?.clipAction(clip)
        if (!action) return
        action.play()
        if (!isPlaying) {
          action.paused = true
        }
      })
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
      }
    }
  }, [scene, animations, isPlaying])

  // 控制动画播放/暂停
  useEffect(() => {
    if (mixerRef.current) {
      mixerRef.current.timeScale = isPlaying ? 4 : 0
    }
  }, [isPlaying])

  // 更新动画和旋转
  useFrame((_state, delta) => {
    if (groupRef.current) {
      // 平滑旋转到目标角度
      const diff = targetRotation - groupRef.current.rotation.y
      groupRef.current.rotation.y += diff * 0.1
    }

    // 更新动画 - 限制最大 delta 避免卡顿
    if (mixerRef.current && isPlaying) {
      const cappedDelta = Math.min(delta, 0.1)
      mixerRef.current.update(cappedDelta)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive 
        object={scene} 
        scale={1.2} 
        position={[0, -3, 0]}
      />
    </group>
  )
}

// 加载中的占位
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ce2828" wireframe />
    </mesh>
  )
}

interface CupheadModelProps {
  className?: string
  children?: React.ReactNode
  rotation?: number
  isPlaying?: boolean
  onRotateLeft?: () => void
  onRotateRight?: () => void
  onTogglePlay?: () => void
}

export default function CupheadModel({
  className = '',
  children,
  rotation = 0,
  isPlaying = true,
  onRotateLeft,
  onRotateRight,
  onTogglePlay
}: CupheadModelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // 根据点击位置判断操作：左侧 1/3 旋转左，右侧 1/3 旋转右，中间 1/3 暂停/播放
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = clickX / rect.width

    if (ratio < 0.33) {
      onRotateLeft?.()
    } else if (ratio > 0.67) {
      onRotateRight?.()
    } else {
      onTogglePlay?.()
    }
  }, [onRotateLeft, onRotateRight, onTogglePlay])

  return (
    <div className={`cuphead-model ${className}`}>
      <div className="cuphead-model__frame">
        <div
          ref={wrapperRef}
          className="cuphead-model__canvas-wrapper cuphead-model__canvas-wrapper--clickable"
          onClick={handleClick}
        >
          <Canvas
            camera={{ position: [0, 0.5, 7], fov: 50 }}
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true
            }}
            dpr={[1, 2]}
            performance={{ min: 0.5 }}
            frameloop="always"
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <pointLight position={[0, 5, 0]} intensity={0.5} color="#f3ead7" />
            
            <Suspense fallback={<LoadingFallback />}>
              <Model url="/models/cuphead/scene.gltf" targetRotation={rotation} isPlaying={isPlaying} />
              <Environment files="/hdri/studio_small_03_1k.hdr" background={false} />
            </Suspense>
          </Canvas>
          {children && <div className="cuphead-model__content">{children}</div>}
        </div>
      </div>
    </div>
  )
}

// 预加载模型
useGLTF.preload('/models/cuphead/scene.gltf')
