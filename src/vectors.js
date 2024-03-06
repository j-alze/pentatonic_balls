/************************************
   P E N T A T O N I C   B A L L S
*************************************
Author:		Janosch Alze
Release:	Feb. 2024
File:		vectors.js
Descr.:		handles vector calculations
Version:	1.0
************************************/

class vector {
	constructor(x=0, y=0) {
		this.x = x;
		this.y = y;
	}

	update(v) { //update vector with other vector v
		this.x = v.x;
		this.y = v.y;
	}

	add(v) { //add vector v and update
		this.update(v_add(this,v));
		return this;
	}

	sub(v) { //subtract vector v and update
		this.update(v_sub(this,v));
		return this;
	}

	norm() { //normalize vector
		this.update(v_scale(this,1/v_norm(this)));
		return this;
	}

	zero() { //make zero vector
		this.x = 0;
		this.y = 0;
	}
}

function v_add(v1, v2) { //add two vectors (v1 + v2) (return: vector)
	return new vector(v1.x + v2.x, v1.y + v2.y);
}

function v_sub(v1, v2) { //subtract two vectors (v1 - v2) (return: vector)
	return new vector(v1.x - v2.x, v1.y - v2.y);
}

function v_inner(v1, v2) { //inner product of two vectors (return: number)
	return v1.x * v2.x + v1.y * v2.y;
}

function v_norm(v) { //norm of vector (return: number)
	return Math.sqrt(v_inner(v,v));
}

function v_dist(v1, v2) { //distance between two points (return: number)
	return v_norm(v_sub(v1,v2));
}

function v_scale(v, factor=1) { //scale vector by a factor (retrun: vector)
	return new vector(v.x * factor, v.y * factor);
}
