from typing import List, Optional
from pydantic import BaseModel, Field

class StepItem(BaseModel):
    step: int = Field(..., description="Step index (e.g. 1, 2, 3)")
    label: str = Field(..., description="Actionable step or stage name")
    description: str = Field(..., description="Concise description of the step action or milestone")

class TimelineItem(BaseModel):
    period: str = Field(..., description="Date, year, quarter, or phase tag (e.g. 'Phase 1', 'Q1 2026', '2024')")
    title: str = Field(..., description="Milestone or phase title")
    description: str = Field(..., description="Milestone outcome, deliverables, or objectives")

class ComparisonColumn(BaseModel):
    heading: str = Field(..., description="Column heading or category name (e.g. 'Current State', 'Proposed Solution')")
    badge: Optional[str] = Field(None, description="Optional badge tag (e.g. 'Before', 'After', 'Pros', 'Cons', 'Option A')")
    points: List[str] = Field(default_factory=list, description="Key points or criteria for this comparison column")

class StatMetricItem(BaseModel):
    metric: str = Field(..., description="High-impact numerical stat, KPI, or percentage (e.g. '98.5%', '$4.2M', '10x', '500K+')")
    label: str = Field(..., description="Short metric label or title")
    description: Optional[str] = Field(None, description="Contextual explanation or significance of the metric")
    trend: Optional[str] = Field(None, description="Optional trend tag (e.g. '+24% YoY', 'Top 5%', 'High Impact')")

class CardItem(BaseModel):
    title: str = Field(..., description="Pillar, feature, or concept headline")
    description: str = Field(..., description="Detailed explanation of this pillar or feature")
    icon_name: Optional[str] = Field("target", description="Icon hint: 'target', 'zap', 'award', 'trending', 'activity', 'shield', or 'lightbulb'")

class TableData(BaseModel):
    headers: List[str] = Field(default_factory=list, description="Column header titles")
    rows: List[List[str]] = Field(default_factory=list, description="Matrix row cells")

class HierarchyItem(BaseModel):
    level: int = Field(..., description="Hierarchical tier level (1 = top / presentation layer, 2 = middle / logic layer, 3 = foundation / data layer)")
    title: str = Field(..., description="Component, service, or organization tier name")
    subtitle: Optional[str] = Field(None, description="Role, responsibility, or technology stack of this layer")

class AISlideItem(BaseModel):
    slide_number: int = Field(..., description="Sequential 1-indexed slide number")
    title: str = Field(..., description="Slide headline/title in requested language")
    subtitle: Optional[str] = Field(None, description="Optional subtitle, topic category, or context tag")
    bullet_points: List[str] = Field(default_factory=list, description="3-5 concise, impactful bullet points in requested language")
    layout_type: str = Field(
        "standard",
        description="Intelligently selected visual layout: 'title', 'section_header', 'process_flow', 'flowchart', 'timeline', 'comparison', 'stats_grid', 'cards_grid', 'table', 'hierarchy', 'architecture', 'two_column', 'conclusion', or 'standard'"
    )
    visual_type: Optional[str] = Field(None, description="Visual type matching layout_type")
    steps: Optional[List[StepItem]] = Field(None, description="Structured steps if layout is process_flow or flowchart")
    timeline_items: Optional[List[TimelineItem]] = Field(None, description="Structured milestones if layout is timeline")
    comparison_columns: Optional[List[ComparisonColumn]] = Field(None, description="Comparison columns if layout is comparison")
    stats: Optional[List[StatMetricItem]] = Field(None, description="Numerical metric cards if layout is stats_grid")
    cards: Optional[List[CardItem]] = Field(None, description="Structured cards if layout is cards_grid")
    table_data: Optional[TableData] = Field(None, description="Structured table matrix if layout is table")
    hierarchy_levels: Optional[List[HierarchyItem]] = Field(None, description="Hierarchical or architecture layers if layout is hierarchy or architecture")
    speaker_notes: str = Field(..., description="Comprehensive natural spoken speaker notes guiding the presenter on what to say in the requested language")
    source_reference: Optional[str] = Field(None, description="Reference to source section or document page if applicable")

class AIPresentationResult(BaseModel):
    title: str = Field(..., description="Main presentation title in requested language")
    language: str = Field(..., description="Target presentation language")
    slides: List[AISlideItem] = Field(..., description="Ordered list of generated slides")

