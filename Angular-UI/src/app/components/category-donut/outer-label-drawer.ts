import { Subcategory } from "@services/category.service";
import { Theme } from "@services/theme.service";
import { ChartArea } from "chart.js";

type LabelFinalPos = {
    lineAngle: number,
    textAngle: number,
    textRadius: number,
    textHalfWidth: number,
    label: string,
    isSubcategory: boolean,
    color: string,
}

type LabelInfo = {
    startAngle: number, //0 pointing straight up, and PI/2 pointing right
    endAngle: number,//0 pointing straight up, and PI/2 pointing right
    label: string,
    isSubcategory: boolean,
    color: string,
}

type TextPos = {
    side: number, //1 = right, -1 = left
    yCenter: number,
    yTop: number,
    yBottom: number,
}

export class OuterLableDrawer{
    private cx: number;
    private cy: number;
    private r: number;
    private circumRatio: number; //if the outer ring only goes 270 degrees, this will be 0.75
    private placedTexts: TextPos[] = [];
    

    constructor(
        private ctx: CanvasRenderingContext2D,
        chartArea: ChartArea,
        private categoryNames: string[], 
        private subcategories: Subcategory[],
        private categoryAmounts: number[], 
        private subcategoryAmounts: number[],
        private theme: Theme,
        categoryCircumDegrees: number,
        private animationProg: number,
        ){
            this.cx = chartArea.left + chartArea.width / 2;
            this.cy = chartArea.top + chartArea.height / 2;
            this.r = chartArea.height / 2;
            this.circumRatio = categoryCircumDegrees / 360;
    }

    drawLabels(){
        var labelInfos = this.getCategoryLabelInfos();
        var finalPositions: LabelFinalPos[] = []
        for (var labelInfo of labelInfos){
            var finalPosition = this.getLabelFinalPos(labelInfo);
            if (finalPosition){
                finalPositions.push(finalPosition);
            }
        }
        var subcatlabelInfos = this.getSubcategoryLabelInfos();
        for (var labelInfo of subcatlabelInfos){
            var finalPosition = this.getLabelFinalPos(labelInfo);
            if (finalPosition){
                finalPositions.push(finalPosition);
            }
        }
        finalPositions.forEach(z => this.drawLabel(z))
    }

    private getCategoryLabelInfos(): LabelInfo[]{
        var categoryLabels: LabelInfo[] = [];
        var sumAmount = this.categoryAmounts.reduce((a, b) => a + b, 0);
        var currentAngle = 0;
        for (var i = 0; i < this.categoryNames.length; i++){
            var angleRange = this.categoryAmounts[i] / sumAmount * Math.PI * 2 * this.circumRatio;
            if (angleRange < .0174){ //less than 1 degree
                continue;
            }
            categoryLabels.push({
                startAngle: currentAngle,
                endAngle: currentAngle + angleRange,
                label: this.categoryNames[i],
                isSubcategory: false,
                color: this.theme.texts[i]
            });
            currentAngle += angleRange;
        }
        return categoryLabels;
    }

    private getSubcategoryLabelInfos(): LabelInfo[]{
        var subcategoryLabels: LabelInfo[] = [];
        var sumAmount = this.subcategoryAmounts.reduce((a, b) => a + b, 0);
        var currentAngle = 0;
        for (var i = 0; i < this.subcategories.length; i++){
            var angleRange = this.subcategoryAmounts[i] / sumAmount * Math.PI * 2 * this.circumRatio;
            if (angleRange < .0174){ //less than 1 degree
                continue;
            }
            var catIndex = this.categoryNames.indexOf(this.subcategories[i].catName);
            subcategoryLabels.push({
                startAngle: currentAngle,
                endAngle: currentAngle + angleRange,
                label: this.subcategories[i].subcatName,
                isSubcategory: true,
                color: this.theme.texts[catIndex]
            });
            currentAngle += angleRange;
        }
        return subcategoryLabels;
    }

    private drawLabel(finalPos: LabelFinalPos){
        var easeOutCubic = 1 - Math.pow(1 - this.animationProg, 3);
        var lineAngle = finalPos.lineAngle * Math.min(1, easeOutCubic);
        var textAngle = finalPos.textAngle * Math.min(1, easeOutCubic);
        var textSide = textAngle < Math.PI ? 1 : -1;
        var inwardAmount = finalPos.isSubcategory ? 36 : 10;

        //because angle zero is up, I use sin for x and cos for y
        var x1 = this.cx + Math.sin(lineAngle) * (this.r - inwardAmount);
        //since higher Y values are further down, I subtract cos rather than add
        var y1 = this.cy - Math.cos(lineAngle) * (this.r - inwardAmount);
        var x2 = this.cx + Math.sin(lineAngle) * (this.r + 12);
        var y2 = this.cy - Math.cos(lineAngle) * (this.r + 12);
        var x3 = x2 + (12 * textSide);

        var projectedTextHalfWidth = finalPos.textHalfWidth * Math.cos(textAngle);
        var textSideAngle = textAngle - Math.asin(projectedTextHalfWidth / finalPos.textRadius) * textSide!;
        var textSideX = this.cx + Math.sin(textSideAngle) * finalPos.textRadius;
        var textSideY = this.cy - Math.cos(textSideAngle) * finalPos.textRadius;

        this.ctx.beginPath();
        this.ctx.moveTo(x1!, y1!);
        this.ctx.lineTo(x2!, y2!);
        this.ctx.lineTo(x3!, y2!);
        this.ctx.setLineDash([4, 3]);
        this.ctx.lineDashOffset = 0;
        this.ctx.strokeStyle = finalPos.color;
        this.ctx.stroke();

        this.ctx.font = finalPos.isSubcategory ? "12px Arial" : "20px Arial";
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = textSide! > 0 ? "left" : "right";
        this.ctx.fillStyle = finalPos.color;
        this.ctx.fillText(finalPos.label, textSideX + 5 * textSide!, textSideY);
    }

    private getLabelFinalPos(info: LabelInfo): LabelFinalPos | null{
        var angle = info.startAngle + (info.endAngle - info.startAngle) / 2
        var x1,x2,x3,y1,y2,side: number;
        for (var remainingAttempts = 3; remainingAttempts > 0; remainingAttempts--){
            side = angle < Math.PI ? 1 : -1;
            var inwardAmount = info.isSubcategory ? 36 : 10;
            //because angle zero is up, I use sin for x and cos for y
            x1 = this.cx + Math.sin(angle) * (this.r - inwardAmount);
            //since higher Y values are further down, I subtract cos rather than add
            y1 = this.cy - Math.cos(angle) * (this.r - inwardAmount);
            x2 = this.cx + Math.sin(angle) * (this.r + 12);
            y2 = this.cy - Math.cos(angle) * (this.r + 12);
            x3 = x2 + (12 * side);

            //now the fun part... see if this overlaps an already-placed label
            var height = info.isSubcategory ? 14 : 22;
            var newText: TextPos = {
                side: side,
                yCenter: y2,
                yTop: y2 - height/2,
                yBottom: y2 + height/2
            };
            var conflicts = this.placedTexts.filter(z => z.side == side  && Math.max(z.yTop, newText.yTop) <  Math.min(z.yBottom, newText.yBottom));
            if (conflicts.length == 0){
                this.placedTexts.push(newText);
                break;
            }
            if (conflicts.length > 1){
                return null; //we're not finding an available spot
            }
            if (y2 < conflicts[0].yCenter){ //if y2 is lower, y2 is slightly above the existing lable
                //we want to move up, and which way is up depends on which side we're on
                var towardAngle = side == 1 ? info.startAngle : info.endAngle;
            } else {
                //we want to move down
                var towardAngle = side == 1 ? info.endAngle : info.startAngle;
            }
            if (remainingAttempts == 3){
                angle = (angle + angle + towardAngle) / 3 
            } else {
                angle = (angle + towardAngle) / 2 
            }
        }
        if (remainingAttempts == 0){
            return null; //unable to find an available spot after 3 tries
        }
        this.ctx.font = info.isSubcategory ? "12px Arial" : "20px Arial";
        var textHalfWidth = this.ctx.measureText(info.label).width / 2 + 5;
        var textCenterX = x3! + (textHalfWidth) * side!;
        var textAngle = Math.atan2((textCenterX - this.cx),(this.cy - y2!));
        var textRadius = Math.sqrt(Math.pow(y2! - this.cy, 2) + Math.pow(x3! - this.cx, 2));
        textAngle = textAngle >= 0 ? textAngle : textAngle + Math.PI * 2;
        return {
            lineAngle: angle,
            textAngle: textAngle,
            textHalfWidth: textHalfWidth,
            textRadius: textRadius,
            label: info.label,
            isSubcategory: info.isSubcategory,
            color: info.color 
        };
    }

}