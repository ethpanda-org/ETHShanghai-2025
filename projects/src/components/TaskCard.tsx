import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Star, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  budget: string;
  urgency: "low" | "medium" | "high";
  timePosted: string;
  tags: string[];
  rating?: number;
}

const TaskCard = ({ id, title, description, budget, urgency, timePosted, tags, rating }: TaskCardProps) => {
  const urgencyColors = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    high: "bg-destructive/10 text-destructive border-destructive/20"
  };

  const urgencyLabels = {
    low: "不急",
    medium: "一般急",
    high: "紧急"
  };

  return (
    <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card group">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          <Badge variant="outline" className={urgencyColors[urgency]}>
            <AlertCircle className="w-3 h-3 mr-1" />
            {urgencyLabels[urgency]}
          </Badge>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-accent">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold">{budget} USDT</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{timePosted}</span>
            </div>
            {rating && (
              <div className="flex items-center gap-1 text-warning">
                <Star className="w-4 h-4 fill-current" />
                <span>{rating}</span>
              </div>
            )}
          </div>
          <Link to={`/task/${id}`}>
            <Button variant="default" size="sm">
              查看详情
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
