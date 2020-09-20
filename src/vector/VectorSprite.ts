namespace pixi_blit {
    const tempMat = new PIXI.Matrix();

    export interface ISprite extends PIXI.Container {
        texture: PIXI.Texture;
        tint?: number;

        containsPoint?(point: PIXI.IPoint): boolean;
    }

    export interface ISpriteGenerator {
        readonly scaleX: number;
        readonly scaleY: number;

        generateSprite(): ISprite;
    }

    export class VectorSprite extends PIXI.Container {
        constructor(public model: VectorModel) {
            super();
        }

        tint = 0xFFFFFF;

        preferredCache: CacheType = CacheType.Auto;

        activeCacheType = CacheType.No_Cache;
        activeRaster: RasterCache = null;
        activeGraphics: PIXI.Graphics = null;
        activeSprite: ISprite = null;
        _rasterId: number = -1;
        _transformId: number = -1;
        snap: boolean = false;

        spriteGenerator: ISpriteGenerator = null;

        enableRaster(raster: RasterCache) {
            if (this.activeRaster == raster) {
                return;
            }
            this.activeRaster = raster;
            this._rasterId = -1;
            this.activeCacheType = raster.type;
        }

        enableGraphics(geom: PIXI.GraphicsGeometry) {
            this.activeCacheType = CacheType.No_Cache;
            if (this.activeGraphics && this.activeGraphics.geometry === geom) {
                return;
            }
            this.activeRaster = null;
            this.activeSprite = null;
            this.activeGraphics = new PIXI.Graphics(geom);
        }

        disable() {
            this.activeCacheType = CacheType.No_Cache;
            this.activeGraphics = null;
            this.activeRaster = null;
            this.activeSprite = null;
        }

        updateTransform() {
            super.updateTransform();
            if (this.activeSprite) {
                this.activeSprite.transform.updateTransform(this.transform);
                this.activeSprite.tint = this.tint;
                (this.activeSprite as any).worldAlpha = this.worldAlpha;
            }
            if (this.activeGraphics) {
                this.activeGraphics.transform.updateTransform(this.transform);
                this.activeGraphics.tint = this.tint;
                (this.activeGraphics as any).worldAlpha = this.worldAlpha;
            }
        }

        prerender() {
            const {activeRaster} = this;

            if (!activeRaster) {
                return;
            }
            // position the raster or graphics
            if (activeRaster.mem.cacheStatus > CacheStatus.Drawn) {
                throw Error("CacheStatus for active raster in vectorSprite is not Drawn!");
            }

            const rid = this.activeRaster.updateId,
                tid = (this.transform as any)._worldID;
            if (this._rasterId === rid &&
                (!this.snap || this._transformId === tid)) {
                return;
            }
            this._rasterId = rid;
            this._transformId = tid;

            if (!this.activeSprite) {
                if (this.spriteGenerator) {
                    this.activeSprite = this.spriteGenerator.generateSprite();
                } else {
                    this.activeSprite = new PIXI.Sprite();
                }
            }

            this.activeSprite.texture = activeRaster.texture;
            tempMat.copyFrom(activeRaster.graphicsNode.transform.localTransform);
            tempMat.tx = -activeRaster.outerBounds.x;
            tempMat.ty = -activeRaster.outerBounds.y;
            tempMat.invert();
            if (this.snap) {
                const wt = this.transform.worldTransform;

                let dx = tempMat.tx * wt.a + wt.tx;
                let dy = tempMat.ty * wt.d + wt.ty;

                dx -= Math.round(dx);
                dy -= Math.round(dy);

                tempMat.tx -= dx / wt.a;
                tempMat.ty -= dy / wt.d;
            }

            this.activeSprite.transform.setFromMatrix(tempMat);
        }

        containsPoint(point: PIXI.IPoint) {
            const {activeSprite, activeGraphics} = this;
            //for now its just sprite copy
            if (activeSprite && activeSprite.containsPoint) {
                return activeSprite.containsPoint(point);
            } else if (activeGraphics) {
                return activeGraphics.containsPoint(point as PIXI.Point);
            }
            return false;
        }

        calculateBounds() {
            const {_bounds, activeSprite, activeGraphics} = this;
            if (activeSprite) {
                activeSprite._bounds = this._bounds;
                activeSprite.calculateBounds();
            } else if (activeGraphics) {
                activeGraphics._bounds = this._bounds;
                activeGraphics.calculateBounds();
            }
        }

        _render(renderer: PIXI.Renderer) {
            const {activeRaster, activeGraphics, activeSprite} = this;
            if (activeRaster) {
                (activeSprite as any)._render(renderer);
            } else if (activeGraphics) {
                (activeGraphics as any)._render(renderer);
            } else {
                // ??? guess no graphics for us, render a marker?
            }
        }
    }
}
