import { CategoryInfo } from "@services/category.service";
import { ChartArea } from "chart.js";

type LabelInfo = {
    startAngle: number, //0 pointing straight up, and PI/2 pointing right
    endAngle: number,//0 pointing straight up, and PI/2 pointing right
    label: string,
    isSubcategory: boolean,
    color: string,
}

type LabelPos = {
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
    private placedLabels: LabelPos[] = [];
    

    constructor(
        private ctx: CanvasRenderingContext2D,
        chartArea: ChartArea,
        private categoryNames: string[], 
        private subcategoryNames: CategoryInfo[],
        private categoryAmounts: number[], 
        private subcategoryAmounts: number[],
        private colors: string[],
        categoryCircumDegrees: number
        ){
            this.cx = chartArea.left + chartArea.width / 2;
            this.cy = chartArea.top + chartArea.height / 2;
            this.r = chartArea.height / 2;
            this.circumRatio = categoryCircumDegrees / 360;
    }

    drawLabels(){
        var labelInfos = this.getCategoryLabelInfos();
        for (var labelInfo of labelInfos){
            this.drawSingleLabel(labelInfo);
        }
        var subcatlabelInfos = this.getSubcategoryLabelInfos();
        for (var labelInfo of subcatlabelInfos){
            this.drawSingleLabel(labelInfo);
        }
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
                color: this.colors[i]
            });
            currentAngle += angleRange;
        }
        return categoryLabels;
    }

    private getSubcategoryLabelInfos(): LabelInfo[]{
        var subcategoryLabels: LabelInfo[] = [];
        var sumAmount = this.subcategoryAmounts.reduce((a, b) => a + b, 0);
        var currentAngle = 0;
        for (var i = 0; i < this.subcategoryNames.length; i++){
            var angleRange = this.subcategoryAmounts[i] / sumAmount * Math.PI * 2 * this.circumRatio;
            if (angleRange < .0174){ //less than 1 degree
                continue;
            }
            var catIndex = this.categoryNames.indexOf(this.subcategoryNames[i].category);
            subcategoryLabels.push({
                startAngle: currentAngle,
                endAngle: currentAngle + angleRange,
                label: this.subcategoryNames[i].subcategory,
                isSubcategory: true,
                color: this.colors[catIndex]
            });
            currentAngle += angleRange;
        }
        return subcategoryLabels;
    }

    private drawSingleLabel(info: LabelInfo){
        var angle = info.startAngle + (info.endAngle - info.startAngle) / 2
        var x1,x2,x3,y1,y2;
        var remainingAttempts = 3;
        while (true){
            if (remainingAttempts == 0){
                return; //unable to find an available spot after 3 tries
            }
            var side = angle < Math.PI ? 1 : -1;
            var inwardAmount = info.isSubcategory ? 36 : 10;
            //because angle zero is up, I use sin for x and cos for y
            x1 = this.cx + Math.sin(angle) * (this.r - inwardAmount);
            //since 
            y1 = this.cy - Math.cos(angle) * (this.r - inwardAmount);
            x2 = this.cx + Math.sin(angle) * (this.r + 12);
            y2 = this.cy - Math.cos(angle) * (this.r + 12);
            x3 = x2 + (12 * side);

            //now the fun part... see if this overlaps an already-placed label
            var height = info.isSubcategory ? 13 : 21;
            var newLabel: LabelPos = {
                side: side,
                yCenter: y2,
                yTop: y2 - height/2,
                yBottom: y2 + height/2
            };
            var conflicts = this.placedLabels.filter(z => z.side == side  && Math.max(z.yTop, newLabel.yTop) <  Math.min(z.yBottom, newLabel.yBottom));
            if (conflicts.length == 0){
                this.placedLabels.push(newLabel);
                break;
            }
            if (conflicts.length > 1){
                return; //we're not finding an available spot
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
            remainingAttempts--;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(x1!, y1!);
        this.ctx.lineTo(x2!, y2!);
        this.ctx.lineTo(x3!, y2!);
        this.ctx.setLineDash([4, 3]);
        this.ctx.lineDashOffset = 0;
        this.ctx.strokeStyle = info.color;
        this.ctx.stroke();

        this.ctx.font = info.isSubcategory ? "12px Arial" : "20px Arial";
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = side! > 0 ? "left" : "right";
        this.ctx.fillStyle = info.color;
        this.ctx.fillText(info.label, x3! + 5 * side!, y2!);
    }
}