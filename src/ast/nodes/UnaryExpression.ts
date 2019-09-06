import { DeoptimizableEntity } from '../DeoptimizableEntity';
import { ExecutionContext } from '../ExecutionContext';
import { PathTracker } from '../utils/PathTracker';
import { EMPTY_PATH, LiteralValueOrUnknown, ObjectPath, UNKNOWN_VALUE } from '../values';
import { LiteralValue } from './Literal';
import * as NodeType from './NodeType';
import { ExpressionNode, NodeBase } from './shared/Node';

const unaryOperators: {
	[operator: string]: (value: LiteralValue) => LiteralValueOrUnknown;
} = {
	'!': value => !value,
	'+': value => +(value as NonNullable<LiteralValue>),
	'-': value => -(value as NonNullable<LiteralValue>),
	delete: () => UNKNOWN_VALUE,
	typeof: value => typeof value,
	void: () => undefined,
	'~': value => ~(value as NonNullable<LiteralValue>)
};

export default class UnaryExpression extends NodeBase {
	argument!: ExpressionNode;
	operator!: keyof typeof unaryOperators;
	prefix!: boolean;
	type!: NodeType.tUnaryExpression;

	bind() {
		super.bind();
		if (this.operator === 'delete') {
			this.argument.deoptimizePath(EMPTY_PATH);
		}
	}

	getLiteralValueAtPath(
		path: ObjectPath,
		recursionTracker: PathTracker,
		origin: DeoptimizableEntity
	): LiteralValueOrUnknown {
		if (path.length > 0) return UNKNOWN_VALUE;
		const argumentValue = this.argument.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
		if (argumentValue === UNKNOWN_VALUE) return UNKNOWN_VALUE;

		return unaryOperators[this.operator](argumentValue as LiteralValue);
	}

	hasEffects(context: ExecutionContext): boolean {
		return (
			this.argument.hasEffects(context) ||
			(this.operator === 'delete' &&
				this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context))
		);
	}

	hasEffectsWhenAccessedAtPath(path: ObjectPath, _context: ExecutionContext) {
		if (this.operator === 'void') {
			return path.length > 0;
		}
		return path.length > 1;
	}
}
