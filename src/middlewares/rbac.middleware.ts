import type { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ResponseDto } from '../shared/dto/response.dto.js';
import { RbacRepository } from '../modules/rbac/infrastructure/rbac.repository.js';

type Permission = 'read' | 'create' | 'update' | 'delete';

const rbacRepository = new RbacRepository();

export function authorize(moduleRoute: string, required: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roleId = req.role_id;
      if (!roleId) {
        res.status(403).json(new ResponseDto(false, 'Permisos insuficientes', null, 403));
        return;
      }

      const modules = await rbacRepository.getModule([moduleRoute], 'path');
      if (!modules.length) {
        res.status(404).json(new ResponseDto(false, 'Módulo no configurado', null, 404));
        return;
      }

      const roles = await rbacRepository.getRole({ value: roleId, include: { role_module: true } });
      if (!roles.length) {
        res.status(403).json(new ResponseDto(false, 'Rol no encontrado', null, 403));
        return;
      }

      const moduleId = modules[0].id;
      type RoleWithModules = Role & { role_module: Array<{ module_id: number; permission: Permission[] }> };
      const role = roles[0] as unknown as RoleWithModules;
      const relation = role.role_module?.find((rm) => rm.module_id === moduleId);
      
      if (!relation || !relation.permission?.includes(required)) {
        res.status(403).json(new ResponseDto(false, 'No autorizado para esta acción', null, 403));
        return;
      }

      next();
    } catch (err) {
      res.status(500).json(new ResponseDto(false, 'Error de autorización', null, 500));
    }
  };
}