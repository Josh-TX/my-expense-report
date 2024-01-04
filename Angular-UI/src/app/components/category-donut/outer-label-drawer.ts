import { getSum } from "@services/helpers";
import { ChartArea } from "chart.js";

export type outerLabelData = {
    fontSize: number,
    inwardPercent: number,
    items: outerLabelDataItem[]
}
export type outerLabelDataItem = {
    displayText: string,
    color: string,
    amount: number,
}

type LabelCalculatedPosition = {
    lineAngle: number,
    textAngle: number,
    textRadius: number,
    textHalfWidth: number,

    fontSize: number,
    inwardPercent: number,
    displayText: string,
    color: string,
}

type DisplayTextPosition = {
    side: number, //1 = right, -1 = left
    yCenter: number,
    yTop: number,
    yBottom: number,
}

export class OuterLableDrawer{
    private cx: number;
    private cy: number;
    private r: number;
    private circumRatio: number;
    private placedTexts: DisplayTextPosition[] = [];
    

    constructor(
        private ctx: CanvasRenderingContext2D,
        chartArea: ChartArea,
        private labelDatas: outerLabelData[],
        outerCircumferenceDegrees: number,
        private animationProgress: number,
        ){
            this.cx = chartArea.left + chartArea.width / 2;
            this.cy = chartArea.top + chartArea.height / 2;
            this.r = Math.min(chartArea.height, chartArea.width) / 2;
            this.circumRatio = outerCircumferenceDegrees / 360;
    }

    drawLabels(){
        var labelPositions = this.getAllLabelPositions();
        labelPositions.forEach(z => this.drawLabel(z))
    }

    private getAllLabelPositions(): LabelCalculatedPosition[]{
        var labelPositions: LabelCalculatedPosition[] = [];
        for (var labelData of this.labelDatas){
            var sumAmount = getSum(labelData.items.map(z => z.amount));
            var currentAngle = 0;
            for (var item of labelData.items){
                var angleRange = item.amount / sumAmount * Math.PI * 2 * this.circumRatio;
                if (angleRange < .0174){ //less than 1 degree
                    currentAngle += angleRange
                    continue;
                }
                var startAngle = currentAngle;
                var endAngle = currentAngle + angleRange;
                var labelPosition = this.getLabelPosition(item, startAngle, endAngle, labelData.fontSize, labelData.inwardPercent);
                if (labelPosition){
                    labelPositions.push(labelPosition);
                }
                currentAngle += angleRange
            }
        }
        return labelPositions;
    }

    private getLabelPosition(item: outerLabelDataItem, startAngle: number, endAngle: number, fontSize: number, inwardPercent: number): LabelCalculatedPosition | null {
        var angle = startAngle + (endAngle - startAngle) / 2
        var x1,x2,x3,y1,y2,side: number;
        for (var remainingAttempts = 3; remainingAttempts > 0; remainingAttempts--){
            side = angle < Math.PI ? 1 : -1;
            //because angle zero is up, I use sin for x and cos for y
            x1 = this.cx + Math.sin(angle) * (this.r - this.r*(inwardPercent/100));
            //since higher Y values are further down, I subtract cos rather than add
            y1 = this.cy - Math.cos(angle) * (this.r - this.r*(inwardPercent/100));
            x2 = this.cx + Math.sin(angle) * (this.r + 12);
            y2 = this.cy - Math.cos(angle) * (this.r + 12);
            x3 = x2 + (12 * side);

            //now the fun part... see if this overlaps an already-placed label
            var height = fontSize * 1.1;
            var newText: DisplayTextPosition = {
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
                var towardAngle = side == 1 ? startAngle : endAngle;
            } else {
                //we want to move down
                var towardAngle = side == 1 ? endAngle : startAngle;
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
        this.ctx.font = fontSize + "px Arial";
        var textHalfWidth = this.ctx.measureText(item.displayText).width / 2 + 5;
        var textCenterX = x3! + (textHalfWidth) * side!;
        var textAngle = Math.atan2((textCenterX - this.cx),(this.cy - y2!));
        var textRadius = Math.sqrt(Math.pow(y2! - this.cy, 2) + Math.pow(x3! - this.cx, 2));
        textAngle = textAngle >= 0 ? textAngle : textAngle + Math.PI * 2;
        return {
            lineAngle: angle,
            textAngle: textAngle,
            textHalfWidth: textHalfWidth,
            textRadius: textRadius,

            displayText: item.displayText,
            inwardPercent: inwardPercent,
            color: item.color,
            fontSize: fontSize,
        };
    }


    

    private drawLabel(labelPosition: LabelCalculatedPosition){
        var easeOutCubic = 1 - Math.pow(1 - this.animationProgress, 3);
        var lineAngle = labelPosition.lineAngle * Math.min(1, easeOutCubic);
        var textAngle = labelPosition.textAngle * Math.min(1, easeOutCubic);
        var textSide = textAngle < Math.PI ? 1 : -1;
        var inwardDistance = this.r * (labelPosition.inwardPercent/100);

        //because angle zero is up, I use sin for x and cos for y
        var x1 = this.cx + Math.sin(lineAngle) * (this.r - inwardDistance);
        //since higher Y values are further down, I subtract cos rather than add
        var y1 = this.cy - Math.cos(lineAngle) * (this.r - inwardDistance);
        var x2 = this.cx + Math.sin(lineAngle) * (this.r + 12);
        var y2 = this.cy - Math.cos(lineAngle) * (this.r + 12);
        var x3 = x2 + (12 * textSide);

        var projectedTextHalfWidth = labelPosition.textHalfWidth * Math.cos(textAngle);
        var textSideAngle = textAngle - Math.asin(projectedTextHalfWidth / labelPosition.textRadius) * textSide!;
        var textSideX = this.cx + Math.sin(textSideAngle) * labelPosition.textRadius;
        var textSideY = this.cy - Math.cos(textSideAngle) * labelPosition.textRadius;

        this.ctx.beginPath();
        this.ctx.moveTo(x1!, y1!);
        this.ctx.lineTo(x2!, y2!);
        this.ctx.lineTo(x3!, y2!);
        this.ctx.setLineDash([4, 3]);
        this.ctx.lineDashOffset = 0;
        this.ctx.strokeStyle = labelPosition.color;
        this.ctx.stroke();

        this.ctx.font = labelPosition.fontSize + "px Arial";
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = textSide! > 0 ? "left" : "right";
        this.ctx.fillStyle = labelPosition.color;
        this.ctx.fillText(labelPosition.displayText, textSideX + 5 * textSide!, textSideY);
    }
}