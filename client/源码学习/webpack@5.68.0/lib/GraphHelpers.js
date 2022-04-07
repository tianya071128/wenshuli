/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Module")} Module */

/**
 * @param {ChunkGroup} chunkGroup the ChunkGroup to connect 需要连接 ChunkGroup
 * @param {Chunk} chunk chunk to tie to ChunkGroup 需要绑定到 chunkGroup 的 chunk
 * @returns {void}
 */
const connectChunkGroupAndChunk = (chunkGroup, chunk) => {
	// 如果该 chunk 没有被推入到 chunkGroup 中的话，就会将其推入到 chunkGroup.chunks 中并返回 true
	if (chunkGroup.pushChunk(chunk)) {
		chunk.addGroup(chunkGroup); // 建立 chunk 与 chunkGroup 连接
	}
};

/**
 * @param {ChunkGroup} parent parent ChunkGroup to connect
 * @param {ChunkGroup} child child ChunkGroup to connect
 * @returns {void}
 */
const connectChunkGroupParentAndChild = (parent, child) => {
	if (parent.addChild(child)) {
		child.addParent(parent);
	}
};

exports.connectChunkGroupAndChunk = connectChunkGroupAndChunk;
exports.connectChunkGroupParentAndChild = connectChunkGroupParentAndChild;
