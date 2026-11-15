"use client";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {Textarea} from "@/components/ui/textarea";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  EyeOff,
  Grip,
  Plus,
  Save,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { HomeContent } from "@/lib/studio/home";

type Slide = HomeContent["slides"][number];
type Props = {
  value: HomeContent;
  onChange: (value: HomeContent) => void;
  onUpload: (file: File | undefined, target: string) => void;
  onSave: () => void;
  dirty: boolean;
  onDiscard:()=>void;
  busy: boolean;
};
function PhotoTile({
  slide,
  index,
  disabled,
  onEdit,
}: {
  slide: Slide;
  index: number;
  disabled: boolean;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
  } as CSSProperties;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      type="button"
      className={`home-photo-tile ${!slide.enabled ? "is-hidden" : ""}`}
      disabled={disabled}
      onClick={onEdit}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`编辑第 ${index + 1} 张照片：${slide.title.zh || "未命名照片"}`}
    >
      <Image
        src={slide.image}
        alt={slide.alt.zh || slide.title.zh || `轮播照片 ${index + 1}`}
        width={400}
        height={400}
        unoptimized
        priority={index === 0}
        draggable={false}
      />
      <span className="home-photo-number">
        {String(index + 1).padStart(2, "0")}
      </span>
      {!slide.enabled && (
        <span className="home-photo-hidden">
          <EyeOff size={11} />
          隐藏
        </span>
      )}
      <span className="home-photo-caption">
        {slide.title.zh || `照片 ${index + 1}`}
      </span>
    </button>
  );
}
export default function HomePhotoManager({
  value,
  onChange,
  onUpload,
  onSave,
  dirty,
  busy,
  onDiscard,
}: Props) {
  const confirmNavigation=useUnsavedChanges(dirty,onDiscard);
  const router = useRouter(),
    params = useSearchParams();
  const photoId = params.get("photo");
  const slide = value.slides.find((item) => item.id === photoId);
  const inDetails = !!slide;
  const [language, setLanguage] = useState<"zh" | "en" | "kr">("zh");
  const [activeId, setActiveId] = useState<string | null>(null);
  const blockClickUntil = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );
  const open = (id: string) => {
    if (Date.now() < blockClickUntil.current) return;
    const next = new URLSearchParams(params.toString());
    next.set("photo", id);
    setLanguage("zh");
    confirmNavigation(()=>router.push(`/dashboard/studio?${next.toString()}`));
  };
  const back = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("photo");
    confirmNavigation(()=>router.replace(`/dashboard/studio?${next.toString()}`));
  };
  const finishDrag = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    blockClickUntil.current = Date.now() + 250;
    if (!over || active.id === over.id) return;
    const from = value.slides.findIndex((item) => item.id === active.id),
      to = value.slides.findIndex((item) => item.id === over.id);
    if (from >= 0 && to >= 0)
      onChange({ ...value, slides: arrayMove(value.slides, from, to) });
  };
  const patch = (patch: Partial<Slide>) => {
    if (slide)
      onChange({
        ...value,
        slides: value.slides.map((item) =>
          item.id === slide.id ? { ...item, ...patch } : item,
        ),
      });
  };
  const upload = (target: string, label: string) => (
    <label className={`editor-upload ${busy ? "is-disabled" : ""}`}>
      <Upload size={15} />
      {label}
      <input
        type="file"
        hidden
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => {
          onUpload(event.target.files?.[0], target);
          event.target.value = "";
        }}
      />
    </label>
  );
  const activeSlide = value.slides.find((item) => item.id === activeId);
  return (
    <div className={`home-photo-manager ${dirty ? "has-changes" : ""}`}>
      {inDetails && (
        <div className="home-photo-detail-heading">
          <h1>照片设置</h1>
          <Button variant="outline" onClick={back}>
            <ChevronLeft size={14} />
            照片墙
          </Button>
        </div>
      )}
      {!inDetails ? (
        <>
          <section className="home-album">
            <div className="home-album-heading">
              <div>
                <h2>轮播照片</h2>
                <p>
                  <Grip size={13} />
                  长按拖动排序
                </p>
              </div>
              <span>{value.slides.length} / 12 张</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => {
                setActiveId(String(event.active.id));
                blockClickUntil.current = Infinity;
              }}
              onDragEnd={finishDrag}
              onDragCancel={() => {
                setActiveId(null);
                blockClickUntil.current = Date.now() + 250;
              }}
              accessibility={{
                screenReaderInstructions: {
                  draggable:
                    "按空格键选中照片，方向键调整顺序，再按空格键放下。按 Escape 取消。",
                },
                announcements: {
                  onDragStart: () => "照片已选中，移动以调整顺序。",
                  onDragOver: ({ over }) =>
                    over ? "移至此处以调整照片顺序。" : undefined,
                  onDragEnd: () => "照片已放下。顺序更改后请保存。",
                  onDragCancel: () => "已取消移动。",
                },
              }}
            >
              <SortableContext
                items={value.slides.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                <div className="home-photo-grid">
                  {value.slides.map((item, index) => (
                    <PhotoTile
                      key={item.id}
                      slide={item}
                      index={index}
                      disabled={busy}
                      onEdit={() => open(item.id)}
                    />
                  ))}
                  <label
                    className={`home-photo-add ${busy || value.slides.length >= 12 ? "is-disabled" : ""}`}
                  >
                    <span>
                      {busy ? (
                        <Loader2 size={25} className="animate-spin" />
                      ) : (
                        <Plus size={28} strokeWidth={1.5} />
                      )}
                    </span>
                    <small>
                      {busy
                        ? "处理中…"
                        : value.slides.length >= 12
                          ? "已达上限"
                          : "添加照片"}
                    </small>
                    <input
                      type="file"
                      hidden
                      aria-label="添加轮播图片"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy || value.slides.length >= 12}
                      onChange={(event) => {
                        onUpload(event.target.files?.[0], "new");
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </SortableContext>
              <DragOverlay>
                {activeSlide ? (
                  <div className="home-photo-drag">
                    <Image
                      src={activeSlide.image}
                      alt="正在移动的照片"
                      width={400}
                      height={400}
                      draggable={false}
                      unoptimized
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
        </>
      ) : (
        <section className="admin-panel home-photo-detail">
          <div className="home-photo-detail-preview">
            <Image
              src={slide!.image}
              alt={slide!.alt.zh || "轮播照片预览"}
              width={600}
              height={700}
              unoptimized
            />
          </div>
          <div className="home-photo-detail-fields">
            {slide && (
              <>
                <div className="home-photo-visibility">
                  <div>
                    <strong>在店铺中展示</strong>
                    <p>关闭后照片仍会保留在照片墙中。</p>
                  </div>
                  <Switch
                    aria-label="启用当前轮播图"
                    checked={slide.enabled}
                    disabled={busy}
                    onCheckedChange={(enabled) => patch({ enabled })}
                  />
                </div>
                <div
                  className="editor-language-tabs"
                  role="group"
                  aria-label="编辑图片语言"
                >
                  {(["zh", "en", "kr"] as const).map((lang) => (
                    <button
                      type="button"
                      key={lang}
                      aria-pressed={language === lang}
                      onClick={() => setLanguage(lang)}
                    >
                      {{ zh: "中文", en: "English", kr: "한국어" }[lang]}
                    </button>
                  ))}
                </div>
                <div className="admin-field">
                  <label htmlFor="slide-title">展示标题</label>
                  <Input
                    id="slide-title"
                    maxLength={200}
                    value={slide.title[language]}
                    disabled={busy}
                    placeholder="给照片起个名字"
                    onChange={(event) =>
                      patch({
                        title: {
                          ...slide.title,
                          [language]: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="slide-alt">图片说明</label>
                  <Textarea
                    id="slide-alt"
                    rows={3}
                    maxLength={200}
                    value={slide.alt[language]}
                    disabled={busy}
                    placeholder="描述这张照片的内容"
                    onChange={(event) =>
                      patch({
                        alt: { ...slide.alt, [language]: event.target.value },
                      })
                    }
                  />
                </div>
              </>
            )}
            {upload(slide!.id, "替换照片")}
            <p className="editor-image-tip">
              支持 JPG、PNG、WebP，单张不超过 4MB。
            </p>
            {slide && (
              <Button
                variant="ghost"
                className="home-photo-remove"
                disabled={busy || value.slides.length === 1}
                onClick={() => {
                  onChange({
                    ...value,
                    slides: value.slides.filter((item) => item.id !== slide.id),
                  });
                  back();
                }}
              >
                <Trash2 size={14} />
                移除照片
              </Button>
            )}
          </div>
        </section>
      )}
      {dirty && (
        <div className="home-photo-savebar">
          <span>有未保存的更改</span>
          <Button onClick={onSave} disabled={busy}>
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}{" "}
            {busy ? "保存中…" : "保存修改"}
          </Button>
        </div>
      )}
    </div>
  );
}
