"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useBlogs, useCreateBlog, usePublishBlog, useUpdateBlog, useDeleteBlog, useCreateBlogComment, usePendingTestimonies, useApproveTestimony, useRejectTestimony } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageCircle,
  Send,
  BookOpen,
  Eye,
  Loader2,
  Plus,
  X,
  Heart,
  Search,
  Clock,
  CheckCircle2,
  Trash2,
  FileText,
  Pencil
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fileToDataUrl, getApiErrorMessage } from "@/lib/api/errors";

export default function CommunityPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const { data: blogsResponse, isLoading: blogsLoading } = useBlogs();
  const blogs = blogsResponse?.results ?? [];

  const { data: pendingResponse } = usePendingTestimonies();
  const pendingTestimonies = pendingResponse?.results ?? [];

  const createBlogMutation = useCreateBlog();
  const publishBlogMutation = usePublishBlog();
  const updateBlogMutation = useUpdateBlog();
  const deleteBlogMutation = useDeleteBlog();
  const createCommentMutation = useCreateBlogComment();
  const approveTestimonyMutation = useApproveTestimony();
  const rejectTestimonyMutation = useRejectTestimony();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [isCreatingBlog, setIsCreatingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [newBlogData, setNewBlogData] = useState({
    title: "",
    paragraphs: [""],
    image: ""
  });

  const isExecutive = ["CEO", "CTO", "COO", "INV", "DESIGNER", "SUPER_ADMIN"].includes(user?.role || "");
  const publishedBlogs = blogs.filter(blog => blog.is_published);
  const unpublishedBlogs = blogs.filter(blog => !blog.is_published);
  const filteredBlogs = publishedBlogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.author?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetBlogForm = () => {
    setNewBlogData({ title: "", paragraphs: [""], image: "" });
    setEditingBlog(null);
  };

  const openEditBlog = (blog: any) => {
    setEditingBlog(blog);
    setNewBlogData({
      title: blog.title || "",
      paragraphs: Array.isArray(blog.paragraphs) && blog.paragraphs.length ? blog.paragraphs : [""],
      image: blog.image || "",
    });
    setIsCreatingBlog(true);
  };

  const handleImageFileChange = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid Image", description: "Please select a valid image file." });
      return;
    }
    setIsReadingImage(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      setNewBlogData((prev) => ({ ...prev, image: imageDataUrl }));
    } catch (error) {
      toast({ variant: "destructive", title: "Image Upload Failed", description: getApiErrorMessage(error, "Could not read that image file.") });
    } finally {
      setIsReadingImage(false);
    }
  };

  const handleCreateBlog = () => {
    if (!newBlogData.title.trim() || newBlogData.paragraphs.some(p => !p.trim())) {
      toast({ variant: "destructive", title: "Missing Information", description: "Title and all paragraphs are required." });
      return;
    }

    const payload = {
      title: newBlogData.title,
      paragraphs: newBlogData.paragraphs.filter(p => p.trim()),
      image: newBlogData.image || undefined
    };
    const options = {
        onSuccess: () => {
          toast({
            title: editingBlog ? "Strategic Log Updated" : "Strategic Log Created",
            description: editingBlog ? "Your log changes are now saved." : "Your post has been saved and published when permitted.",
          });
          resetBlogForm();
          setIsCreatingBlog(false);
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: getApiErrorMessage(error, editingBlog ? "Failed to update strategic log." : "Failed to create strategic log."),
            variant: "destructive"
          });
        }
      };

    if (editingBlog) {
      updateBlogMutation.mutate({ id: editingBlog.id, data: payload }, options);
    } else {
      createBlogMutation.mutate(payload, options);
    }
  };

  const handlePublishBlog = (blogId: string) => {
    publishBlogMutation.mutate(blogId, {
      onSuccess: () => {
        toast({ title: "Blog Published", description: "Your post is now visible to the community." });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to publish blog"),
          variant: "destructive"
        });
      }
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedBlog) return;

    createCommentMutation.mutate(
      { blogId: selectedBlog.id, content: commentText },
      {
        onSuccess: () => {
          toast({ title: "Comment Added", description: "Your feedback has been posted." });
          setCommentText("");
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: getApiErrorMessage(error, "Failed to add comment"),
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleApproveTestimony = (testimonyId: string) => {
    approveTestimonyMutation.mutate(testimonyId, {
      onSuccess: () => {
        toast({ title: "Approved", description: "Testimony published to community." });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
            description: getApiErrorMessage(error, "Failed to approve testimony"),
          variant: "destructive"
        });
      }
    });
  };

  const handleRejectTestimony = (testimonyId: string) => {
    rejectTestimonyMutation.mutate(testimonyId, {
      onSuccess: () => {
        toast({ title: "Rejected", description: "Testimony has been declined." });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
            description: getApiErrorMessage(error, "Failed to reject testimony"),
          variant: "destructive"
        });
      }
    });
  };

  const handleAddParagraph = () => {
    setNewBlogData(prev => ({ ...prev, paragraphs: [...prev.paragraphs, ""] }));
  };

  const handleRemoveParagraph = (index: number) => {
    if (newBlogData.paragraphs.length === 1) return;
    setNewBlogData(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, i) => i !== index)
    }));
  };

  const handleParagraphChange = (index: number, value: string) => {
    setNewBlogData(prev => {
      const updated = [...prev.paragraphs];
      updated[index] = value;
      return { ...prev, paragraphs: updated };
    });
  };

  const handleDeleteBlog = (blog: any) => {
    if (!window.confirm(`Delete "${blog.title}" permanently? This action cannot be undone.`)) return;
    deleteBlogMutation.mutate(blog.id, {
      onSuccess: () => toast({ title: "Strategic Log Deleted", description: "The log has been removed from the community archive." }),
      onError: (error: any) => toast({ variant: "destructive", title: "Delete Failed", description: getApiErrorMessage(error, "Could not delete this strategic log.") }),
    });
  };

  if (blogsLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <MessageCircle className="w-6 h-6 text-secondary" />
            </div>
            {language === 'en' ? "Community Portal" : "Portail Communautaire"}
          </h1>
          <p className="text-muted-foreground mt-1">Share insights, stories, and updates with the EduIgnite community.</p>
        </div>
        {isExecutive && (
          <Dialog open={isCreatingBlog} onOpenChange={(open) => { setIsCreatingBlog(open); if (!open) resetBlogForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl h-11 px-6 shadow-lg bg-secondary text-primary hover:bg-secondary/90 font-bold">
                <Plus className="w-4 h-4" /> New Blog Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-primary p-8 text-white">
                <DialogTitle className="text-2xl font-black">{editingBlog ? "Edit Strategic Log" : "Create Blog Post"}</DialogTitle>
                <DialogDescription className="text-white/60">Share your thoughts and updates with the community.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</Label>
                  <Input
                    value={newBlogData.title}
                    onChange={(e) => setNewBlogData({ ...newBlogData, title: e.target.value })}
                    placeholder="Blog title..."
                    className="h-12 bg-accent/30 border-none rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Feature Image (Optional)</Label>
                  <div className="grid gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e.target.files?.[0])}
                      disabled={isReadingImage}
                      className="h-12 bg-accent/30 border-none rounded-xl file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                    />
                    <Input
                      value={newBlogData.image}
                      onChange={(e) => setNewBlogData({ ...newBlogData, image: e.target.value })}
                      placeholder="Or paste https://... / data:image..."
                      className="h-12 bg-accent/30 border-none rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content</Label>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px] font-black uppercase" onClick={handleAddParagraph}>
                      <Plus className="w-3 h-3" /> Add Paragraph
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {newBlogData.paragraphs.map((para, idx) => (
                      <div key={idx} className="group relative">
                        <Textarea
                          value={para}
                          onChange={(e) => handleParagraphChange(idx, e.target.value)}
                          placeholder={`Paragraph ${idx + 1}...`}
                          className="min-h-[100px] bg-accent/30 border-none rounded-xl p-4 resize-none focus-visible:ring-primary"
                        />
                        {newBlogData.paragraphs.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleRemoveParagraph(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                <Button
                  onClick={handleCreateBlog}
                  disabled={createBlogMutation.isPending || updateBlogMutation.isPending || isReadingImage}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold gap-2"
                >
                  {createBlogMutation.isPending || updateBlogMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editingBlog ? "Save Strategic Log" : "Create Blog Post"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className={cn(
          "grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-3xl",
          isExecutive ? "grid-cols-3 md:w-[600px]" : "grid-cols-1 md:w-[200px]"
        )}>
          <TabsTrigger value="feed" className="gap-2 py-3 rounded-2xl transition-all font-bold">
            <BookOpen className="w-4 h-4" /> Community Feed
          </TabsTrigger>
          {isExecutive && (
            <>
              <TabsTrigger value="drafts" className="gap-2 py-3 rounded-2xl transition-all font-bold">
                <FileText className="w-4 h-4" /> My Drafts
              </TabsTrigger>
              <TabsTrigger value="testimonies" className="gap-2 py-3 rounded-2xl transition-all font-bold">
                <Heart className="w-4 h-4" /> Testimonies
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="feed" className="space-y-6 animate-in fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search blogs by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white border-none rounded-xl shadow-sm"
            />
          </div>

          <div className="space-y-6">
            {filteredBlogs.length === 0 ? (
              <Card className="border-none shadow-sm bg-accent/20 p-8">
                <div className="text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-muted-foreground font-bold">No published blogs yet</p>
                  <p className="text-sm text-muted-foreground/60">Check back soon for community stories.</p>
                </div>
              </Card>
            ) : (
              filteredBlogs.map((blog) => (
                <Card key={blog.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                  {blog.image && (
                    <div className="aspect-video bg-slate-200 overflow-hidden">
                      <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-black text-primary">{blog.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-8 w-8 border border-primary/10">
                            <AvatarImage src={blog.author?.avatar} />
                            <AvatarFallback>{blog.author?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-xs">
                            <p className="font-bold text-primary">{blog.author?.name}</p>
                            <p className="text-muted-foreground flex items-center gap-1">
                               <Clock className="w-3 h-3" /> {new Date(blog.created_at ?? Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold border-primary/10 text-primary flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {blog.view_count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {blog.paragraphs.slice(0, 2).map((para, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {para}
                      </p>
                    ))}
                  </CardContent>
                  <CardFooter className="bg-accent/10 p-4 border-t flex flex-wrap gap-2">
                    <Dialog open={selectedBlog?.id === blog.id} onOpenChange={(open) => {
                      if (open) setSelectedBlog(blog);
                      else setSelectedBlog(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="flex-1 text-primary font-bold h-10 gap-2">
                          <MessageCircle className="w-4 h-4" /> Read & Comment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="mb-4">
                          <DialogTitle className="text-2xl font-black text-primary">{selectedBlog?.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {selectedBlog?.image && (
                            <img src={selectedBlog.image} alt={selectedBlog.title} className="w-full rounded-xl" />
                          )}
                          <div className="flex items-center gap-2 pb-4 border-b">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={selectedBlog?.author?.avatar} />
                              <AvatarFallback>{selectedBlog?.author?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-xs">
                              <p className="font-bold text-primary">{selectedBlog?.author?.name}</p>
                              <p className="text-muted-foreground">{new Date(selectedBlog?.created_at ?? Date.now()).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {selectedBlog?.paragraphs.map((para, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                              {para}
                            </p>
                          ))}
                          <div className="border-t pt-4 mt-6">
                            <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" /> Comments
                            </h4>
                            <div className="space-y-3">
                              <div className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user?.avatar} />
                                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                  <Textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="min-h-[80px] bg-accent/30 border-none rounded-xl p-3 resize-none text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={handleAddComment}
                                    disabled={createCommentMutation.isPending || !commentText.trim()}
                                    className="bg-primary text-white font-bold gap-2"
                                  >
                                    {createCommentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    Post Comment
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-primary/40 hover:text-primary">
                      <Heart className="w-4 h-4" />
                    </Button>
                    {isExecutive && (
                      <>
                        <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-primary" onClick={() => openEditBlog(blog)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-destructive" onClick={() => handleDeleteBlog(blog)} disabled={deleteBlogMutation.isPending}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {isExecutive && (
          <TabsContent value="drafts" className="space-y-6 animate-in fade-in">
            <div className="space-y-4">
              {unpublishedBlogs.length === 0 ? (
                <Card className="border-none shadow-sm bg-accent/20 p-8">
                  <div className="text-center space-y-2">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-muted-foreground font-bold">No unpublished drafts</p>
                    <p className="text-sm text-muted-foreground/60">Create a new post to get started.</p>
                  </div>
                </Card>
              ) : (
                unpublishedBlogs.map((blog) => (
                  <Card key={blog.id} className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg font-black text-primary">{blog.title}</CardTitle>
                          <Badge variant="outline" className="mt-2 text-[10px] font-bold border-amber-500/20 bg-amber-50 text-amber-700">
                            DRAFT
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => openEditBlog(blog)}
                            className="font-bold gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handlePublishBlog(blog.id)}
                            disabled={publishBlogMutation.isPending}
                            className="bg-primary text-white font-bold gap-2"
                          >
                            {publishBlogMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Publish
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteBlog(blog)}
                            disabled={deleteBlogMutation.isPending}
                            className="font-bold gap-2 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}

        {isExecutive && (
          <TabsContent value="testimonies" className="space-y-6 animate-in fade-in">
            <div className="space-y-4">
              {pendingTestimonies.length === 0 ? (
                <Card className="border-none shadow-sm bg-accent/20 p-8">
                  <div className="text-center space-y-2">
                    <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-muted-foreground font-bold">No pending testimonies</p>
                    <p className="text-sm text-muted-foreground/60">Community feedback will appear here.</p>
                  </div>
                </Card>
              ) : (
                pendingTestimonies.map((testimony) => (
                  <Card key={testimony.id} className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={testimony.author?.avatar} />
                              <AvatarFallback>{testimony.author?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-bold text-primary text-sm">{testimony.author?.name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{testimony.content}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="bg-accent/10 p-4 border-t flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-green-500/20 text-green-700 hover:bg-green-50 font-bold"
                        onClick={() => handleApproveTestimony(testimony.id)}
                        disabled={approveTestimonyMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {approveTestimonyMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/20 text-red-700 hover:bg-red-50 font-bold"
                        onClick={() => handleRejectTestimony(testimony.id)}
                        disabled={rejectTestimonyMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {rejectTestimonyMutation.isPending ? "Rejecting..." : "Reject"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
