import { Vector3 } from 'three';
import { clamp } from './flight.js';
export const ATTACK_WARNING = 1.6;

// Telegraph, commit to an aim point, then break away: no unavoidable homing fire.
export function updateEnemy(enemy, player, dt) {
  const p=enemy.mesh.position;
  const ai=enemy.ai ||= {phase:'approach',clock:0,cooldown:6+(enemy.phase||0),aim:new Vector3(),direction:new Vector3(),side:(enemy.phase||0)>3?1:-1};
  ai.clock+=dt;ai.cooldown=Math.max(0,ai.cooldown-dt);
  if (enemy.guard && enemy.guard.hp<=0) {
    enemy.guard=null;enemy.kind='interceptor';
    ai.phase='approach';ai.clock=0;ai.cooldown=3;
  }
  let shot=null;
  if (ai.phase==='approach') {
    if (enemy.guard && player.position.distanceTo(enemy.guard.mesh.position)>420) {
      const formation=enemy.guard.mesh.position.clone().add(new Vector3(ai.side*48,16,38));
      const offset=formation.sub(p);
      p.addScaledVector(offset.clone().normalize(),Math.min(offset.length(),dt*90));
      enemy.mesh.lookAt(enemy.guard.destination);
      return null;
    }
    const destination=player.position.clone().addScaledVector(player.forward,80);
    const direction=destination.sub(p).normalize();
    p.addScaledVector(direction,dt*52);
    enemy.mesh.lookAt(p.clone().add(direction));
    if (p.distanceTo(player.position)<420 && ai.cooldown<=0) {
      ai.phase='warning';ai.clock=0;
      const lead=ATTACK_WARNING+Math.max(0,p.distanceTo(player.position)-(25+player.speed)*ATTACK_WARNING)/(95+player.speed);
      ai.aim.copy(player.position).addScaledVector(player.forward,player.speed*lead);
      ai.direction.subVectors(ai.aim,p).normalize();
    }
  } else if (ai.phase==='warning') {
    p.addScaledVector(ai.direction,dt*25);
    enemy.mesh.lookAt(ai.aim);
    if (ai.clock>=ATTACK_WARNING) {
      ai.phase='attack';ai.clock=0;
      ai.direction.subVectors(ai.aim,p).normalize();
      shot=ai.direction.clone();
    }
  } else if (ai.phase==='attack') {
    p.addScaledVector(ai.direction,dt*78);
    enemy.mesh.lookAt(p.clone().add(ai.direction));
    if(ai.clock>=2.2){ai.phase='escape';ai.clock=0;}
  } else {
    const turn=ai.side*dt*.65, x=ai.direction.x,z=ai.direction.z;
    ai.direction.x=x*Math.cos(turn)-z*Math.sin(turn);
    ai.direction.z=x*Math.sin(turn)+z*Math.cos(turn);
    p.addScaledVector(ai.direction,dt*85);
    enemy.mesh.lookAt(p.clone().add(ai.direction));
    enemy.mesh.rotateZ(ai.side*.4);
    if(ai.clock>=3.5){ai.phase='approach';ai.clock=0;ai.cooldown=4;}
  }
  p.y=clamp(p.y,90,390);
  return shot;
}
